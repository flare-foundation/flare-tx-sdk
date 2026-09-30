import { Wallet } from "../wallet"
import { Account } from "./account"
import { CChain } from "./cchain"
import { NetworkCore, NetworkBased } from "./core"
import { PChain } from "./pchain"
import { AfterTxConfirmationCallback, AfterTxSubmissionCallback, BeforeTxSignatureCallback, BeforeTxSubmissionCallback } from "./callback"
import { Constants } from "./constants"
import { Balance, FdcAttestation, FdcAttestationRequest, FdcSourceNetwork, FoundationProposalInfo, FoundationProposalSupport, FtsoDelegate, FtsoRewardClaimWithProof, FtsoRewardState, RNatAccountBalance, RNatProject, RNatProjectAndClaimableReward, RNatProjectInfo, SafeSmartAccount, Stake, StakeLimits } from "./iotype"
import { FlareContract } from "./contract"
import { Utils } from "./utils"

/**
 * The main class used for interaction with the Flare network.
 */
export class Network extends NetworkBased {

    /**
     * Network constructor.
     * @param constants Network constants of class {@link Cosntants}.
     */
    constructor(constants: Constants) {
        super(new NetworkCore(constants))
        this._cchain = new CChain(this._core)
        this._pchain = new PChain(this._core)
    }

    /**
     * The main Flare network.
     */
    static readonly FLARE = new Network(Constants.FLARE)

    /**
     * The canary Flare network.
     */
    static readonly SONGBIRD = new Network(Constants.SONGBIRD)

    /**
     * The test Flare network.
     */
    static readonly COSTON2 = new Network(Constants.COSTON2)

    /**
     * The test canary Flare network.
     */
    static readonly COSTON = new Network(Constants.COSTON)

    protected _cchain: CChain
    protected _pchain: PChain

    /**
     * Derives the C-chain address from the given public key.
     * @param publicKey A public key in hexadecimal encoding.
     * @returns The C-chain address in checksummed hexadecimal encoding.
     */
    getCAddress(publicKey: string): string {
        return Account.getCAddress(publicKey)
    }

    /**
     * Derives the P-chain address from the given public key.
     * @param publicKey A public key in hexadecimal encoding.
     * @returns The P-chain address in bech32 encoding.
     */
    getPAddress(publicKey: string): string {
        return Account.getPAddress(publicKey, this._core.hrp)
    }

    /**
     * Returns balance information related the given public key.
     * @param publicKey A public key in hexadecimal encoding.
     * @returns The object of type {@link Balance}.
     */
    async getBalance(publicKey: string): Promise<Balance> {
        let cAddress = Account.getCAddress(publicKey)
        let pAddress = Account.getPAddress(publicKey, this._core.hrp)

        let availableOnC = await this._cchain.getBalance(cAddress)
        let availableOnP = await this._pchain.getBalance(pAddress)
        let wrappedOnC = await this._cchain.getWrappedBalance(cAddress)
        let stakedOnP = await this._pchain.getStakedBalance(pAddress)
        let notImportedToC = await this._cchain.getBalanceNotImportedToC(pAddress)
        let notImportedToP = await this._pchain.getBalanceNotImportedToP(pAddress)

        return { availableOnC, availableOnP, wrappedOnC, stakedOnP, notImportedToC, notImportedToP }
    }

    /**
     * Returns balance on the C-chain.
     * @param publicKeyOrAddress A public key or a C-chain address in hexadecimal encoding.
     * @returns The balance in wei corresponding to the public key or address.
     */
    async getBalanceOnC(publicKeyOrAddress: string): Promise<bigint> {
        let cAddress = Account.isCAddress(publicKeyOrAddress) ?
            publicKeyOrAddress : Account.getCAddress(publicKeyOrAddress)
        return this._cchain.getBalance(cAddress)
    }

    /**
     * Returns balance wrapped on the C-chain.
     * @param publicKeyOrAddress A public key or a C-chain address in hexadecimal encoding.
     * @returns The balance in wei corresponding to the public key or address.
     */
    async getBalanceWrappedOnC(publicKeyOrAddress: string): Promise<bigint> {
        let cAddress = Account.isCAddress(publicKeyOrAddress) ?
            publicKeyOrAddress : Account.getCAddress(publicKeyOrAddress)
        return this._cchain.getWrappedBalance(cAddress)
    }

    /**
     * Returns rNat account address.
     * @param publicKeyOrAddress A public key or a C-chain address in hexadecimal encoding.
     * @returns The C-chain address in hexadecimal encoding of the rNat account associated
     * with the public key or address.
     */
    async getRNatAccount(publicKeyOrAddress: string): Promise<string> {
        let cAddress = Account.isCAddress(publicKeyOrAddress) ?
            publicKeyOrAddress : Account.getCAddress(publicKeyOrAddress)
        return this._cchain.getRNatAccount(cAddress)
    }

    /**
     * Returns balance of the rNat account.
     * @param publicKeyOrAddress A public key or a C-chain address in hexadecimal encoding.
     * @returns The object of type {@link RNatAccountBalance} containing the balance
     * information about the rNat account associated with the public key or address.
     */
    async getRNatAccountBalance(publicKeyOrAddress: string): Promise<RNatAccountBalance> {
        let cAddress = Account.isCAddress(publicKeyOrAddress) ?
            publicKeyOrAddress : Account.getCAddress(publicKeyOrAddress)
        return this._cchain.getRNatAccountBalance(cAddress)
    }

    /**
     * Returns balance of unlocked wrapped tokens on an rNat account.
     * @param publicKeyOrAddress A public key or a C-chain address in hexadecimal encoding.
     * @returns The balance in wei of the rNat account associated with the public key or address.
     */
    async getUnlockedBalanceWrappedOnRNatAccount(publicKeyOrAddress: string): Promise<bigint> {
        let cAddress = Account.isCAddress(publicKeyOrAddress) ?
            publicKeyOrAddress : Account.getCAddress(publicKeyOrAddress)
        let balance = await this._cchain.getRNatAccountBalance(cAddress)
        return balance.wNatBalance - balance.lockedBalance
    }

    /**
     * Returns balance of locked wrapped tokens on an rNat account.
     * @param publicKeyOrAddress A public key or a C-chain address in hexadecimal encoding.
     * @returns The balance in wei of the rNat account associated with the public key or address.
     */
    async getLockedBalanceWrappedOnRNatAccount(publicKeyOrAddress: string): Promise<bigint> {
        let cAddress = Account.isCAddress(publicKeyOrAddress) ?
            publicKeyOrAddress : Account.getCAddress(publicKeyOrAddress)
        let balance = await this._cchain.getRNatAccountBalance(cAddress)
        return balance.lockedBalance
    }

    /**
     * Returns balance on the P-chain.
     * @param publicKeyOrAddress A public key in hexadecimal encoding or a P-chain address in bech32 encoding.
     * @returns The balance in wei corresponding to the public key or address.
     */
    async getBalanceOnP(publicKeyOrAddress: string): Promise<bigint> {
        let pAddress = Account.isPAddress(publicKeyOrAddress, this._core.hrp) ?
            Account.normalizePAddress(publicKeyOrAddress, this._core.hrp) : Account.getPAddress(publicKeyOrAddress, this._core.hrp)
        return this._pchain.getBalance(pAddress)
    }

    /**
     * Returns balance not imported to the C-chain.
     * @param publicKeyOrAddress A public key in hexadecimal encoding or a P-chain address in bech32 encoding.
     * @returns The balance in wei corresponding to the public key or address.
     */
    async getBalanceNotImportedToC(publicKeyOrAddress: string): Promise<bigint> {
        let pAddress = Account.isPAddress(publicKeyOrAddress, this._core.hrp) ?
            Account.normalizePAddress(publicKeyOrAddress, this._core.hrp) : Account.getPAddress(publicKeyOrAddress, this._core.hrp)
        return this._cchain.getBalanceNotImportedToC(pAddress)
    }

    /**
     * Returns balance not imported to the P-chain.
     * @param publicKeyOrAddress A public key in hexadecimal encoding or a P-chain address in bech32 encoding.
     * @returns The balance in wei corresponding to the public key or address.
     */
    async getBalanceNotImportedToP(publicKeyOrAddress: string): Promise<bigint> {
        let pAddress = Account.isPAddress(publicKeyOrAddress, this._core.hrp) ?
            Account.normalizePAddress(publicKeyOrAddress, this._core.hrp) : Account.getPAddress(publicKeyOrAddress, this._core.hrp)
        return this._pchain.getBalanceNotImportedToP(pAddress)
    }

    /**
     * Returns balance staked on the P-chain.
     * @param publicKeyOrAddress A public key in hexadecimal encoding or a P-chain address in bech32 encoding.
     * @returns The balance in wei corresponding to the public key or address.
     */
    async getBalanceStakedOnP(publicKeyOrAddress: string): Promise<bigint> {
        let pAddress = Account.isPAddress(publicKeyOrAddress, this._core.hrp) ?
            Account.normalizePAddress(publicKeyOrAddress, this._core.hrp) : Account.getPAddress(publicKeyOrAddress, this._core.hrp)
        return this._pchain.getStakedBalance(pAddress)
    }

    /**
     * Returns information about stakes on the P-chain.
     * @param publicKeyOrAddress A public key in hexadecimal encoding or a P-chain address in bech32 encoding (optional).
     * @returns The array of stakes on the P-chain
     * (corresponding to the given public key or address if given).
     */
    async getStakesOnP(publicKeyOrAddress?: string): Promise<Array<Stake>> {
        if (publicKeyOrAddress) {
            let pAddress = Account.isPAddress(publicKeyOrAddress, this._core.hrp) ?
                Account.normalizePAddress(publicKeyOrAddress, this._core.hrp) : Account.getPAddress(publicKeyOrAddress, this._core.hrp)
            return this._pchain.getStakesOf(pAddress)
        } else {
            return this._pchain.getStakes()
        }
    }

    /**
     * Returns information about validators on the P-chain.
     * @returns The array of stakes on the P-chain corresponding to validators.
     */
    async getValidatorsOnP(): Promise<Array<Stake>> {
        return this._pchain.getValidators()
    }

    /**
     * Returns information about stakes on the P-chain corresponding to a specific validator.
     * @param nodeId The code of a validator's node. (optional).
     * @returns The array of stakes on the P-chain (corresponding to the given node if given).
     */
    async getValidatorStakesOnP(nodeId: string): Promise<Array<Stake>> {
        return this._pchain.getStakes(nodeId)
    }

    /**
     * Returns information about stake limits on the P-chain
     * @returns An object of type {@link StakeLimits}
     */
    async getStakeLimits(): Promise<StakeLimits> {
        let csl = await this._cchain.getStakeLimits()
        let psl = await this._pchain.getStakeLimits()
        let minStakeDuration = Utils.max(csl.minStakeDuration, psl.minStakeDuration)
        let maxStakeDuration = Utils.min(csl.maxStakeDuration, psl.maxStakeDuration)
        let minStakeAmountDelegator = Utils.max(csl.minStakeAmountDelegator, psl.minStakeAmountDelegator)
        let minStakeAmountValidator = Utils.max(csl.minStakeAmountValidator, psl.minStakeAmountValidator)
        let maxStakeAmount = Utils.min(csl.maxStakeAmount, psl.maxStakeAmount)
        return { minStakeDuration, maxStakeDuration, minStakeAmountDelegator, minStakeAmountValidator, maxStakeAmount }
    }

    /**
     * Returns the amount of claimable reward from staking.
     * @param publicKeyOrAddress A public key or a C-chain address in hexadecimal encoding.
     * @returns The reward in wei corresponding to the public key or address.
     */
    async getClaimableStakingReward(publicKeyOrAddress: string): Promise<bigint> {
        let cAddress = Account.isCAddress(publicKeyOrAddress) ?
            publicKeyOrAddress : Account.getCAddress(publicKeyOrAddress)
        return this._cchain.getClaimableStakingReward(cAddress)
    }

    /**
     * Returns the amount of claimable reward from FTSO delegation.
     * @param publicKeyOrAddress A public key or a C-chain address in hexadecimal encoding.
     * @returns The reward in wei corresponding to the public key or address.
     */
    async getClaimableFtsoReward(publicKeyOrAddress: string): Promise<bigint> {
        let cAddress = Account.isCAddress(publicKeyOrAddress) ?
            publicKeyOrAddress : Account.getCAddress(publicKeyOrAddress)
        return this._cchain.getClaimableFtsoReward(cAddress)
    }

    /**
     * Returns the state of rewards from FTSO delegation.
     * @param publicKeyOrAddress A public key or a C-chain address in hexadecimal encoding.
     * @returns The array of reward states for all unclaimed reward epochs with claimable rewards
     * corresponding to the public key or address.
     */
    async getStateOfFtsoRewards(publicKeyOrAddress: string): Promise<Array<Array<FtsoRewardState>>> {
        let cAddress = Account.isCAddress(publicKeyOrAddress) ?
            publicKeyOrAddress : Account.getCAddress(publicKeyOrAddress)
        return this._cchain.getStateOfFtsoRewards(cAddress)
    }

    /**
     * Returns FTSO delegates on the C-chain.
     * @param publicKeyOrAddress A public key or a C-chain address in hexadecimal encoding.
     * @returns The array of objects of type {@link FtsoDelegate} that contains information
     * about the FTSO delegates and shares that the address specified by `publicKeyOrAddress`
     * currently delegates to.
     */
    async getFtsoDelegatesOf(publicKeyOrAddress: string): Promise<Array<FtsoDelegate>> {
        let cAddress = Account.isCAddress(publicKeyOrAddress) ?
            publicKeyOrAddress : Account.getCAddress(publicKeyOrAddress)
        return this._cchain.getFtsoDelegatesOf(cAddress)
    }

    /**
     * Returns rNat projects.
     * @returns The array of objects of type {@link RNatProject} that contains basic information
     * about the rNat projects.
     */
    async getRNatProjects(): Promise<Array<RNatProject>> {
        return this._cchain.getRNatProjects()
    }

    /**
     * Returns rNat projects together with the claimable rNat reward for each project.
     * All values are read atomically in a single call against the same block.
     * @param publicKeyOrAddress A public key or a C-chain address in hexadecimal encoding.
     * @returns The array of objects of type {@link RNatProjectAndClaimableReward} that contains basic
     * information about the rNat projects and the reward in wei claimable by the address specified
     * by `publicKeyOrAddress`.
     */
    async getRNatProjectsAndClaimableRewards(publicKeyOrAddress: string): Promise<Array<RNatProjectAndClaimableReward>> {
        let cAddress = Account.isCAddress(publicKeyOrAddress) ?
            publicKeyOrAddress : Account.getCAddress(publicKeyOrAddress)
        return this._cchain.getRNatProjectsAndClaimableRewards(cAddress)
    }

    /**
     * Returns rNat project information.
     * @param projectId A project id number.
     * @returns The object of type {@link RNatProjectInfo} that contains detailed information
     * about the rNat project with the given project id.
     */
    async getRNatProjectInfo(projectId: number): Promise<RNatProjectInfo> {
        return this._cchain.getRNatProjectInfo(projectId)
    }

    /**
     * Returns the amount of claimable rNat reward for the given project and owner.
     * @param projectId A project id number
     * @param publicKeyOrAddress A public key or a C-chain address in hexadecimal encoding.
     * @returns The reward in wei corresponding to the project and public key or address.
     */
    async getClaimableRNatReward(projectId: number, publicKeyOrAddress: string): Promise<bigint> {
        let cAddress = Account.isCAddress(publicKeyOrAddress) ?
            publicKeyOrAddress : Account.getCAddress(publicKeyOrAddress)
        return this._cchain.getClaimableRNatReward(projectId, cAddress)
    }

    /**
     * Transfers wallet funds to a given recipient on the C-chain.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param recipient A C-chain address of the transfer recipient.
     * @param amount An amount in wei to be wrapped on the C-chain.
     */
    async transferNative(wallet: Wallet, recipient: string, amount: bigint): Promise<void> {
        this._shouldBeBigInt("amount", amount)
        this._shouldBeNonnegativeInteger("amount", amount)
        let cAddress = await this._getCAddress(wallet)
        await this._cchain.tx.transfer(wallet, cAddress, recipient, amount)
    }

    /**
     * Attempts to transfer all wallet funds to a given recipient on the C-chain.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param recipient A C-chain address of the transfer recipient.
     * @remark As fees on the C-chain are subjected to change, a certain amount of dust may be left on
     * the account after the transaction is executed.
     */
    async transferAllNative(wallet: Wallet, recipient: string): Promise<void> {
        let cAddress = await this._getCAddress(wallet)
        await this._cchain.tx.transfer(wallet, cAddress, recipient)
    }

    /**
     * Wraps wallet funds on the C-chain.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param amount An amount in wei to be wrapped on the C-chain.
     */
    async wrapNative(wallet: Wallet, amount: bigint): Promise<void> {
        this._shouldBeBigInt("amount", amount)
        this._shouldBeNonnegativeInteger("amount", amount)
        let cAddress = await this._getCAddress(wallet)
        await this._cchain.tx.wrap(wallet, cAddress, amount)
    }

    /**
     * Unwraps wallet funds on the C-chain.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param amount An amount in wei to be unwrapped on the C-chain.
     * If the amount is not given, all wrapped funds are unwrapped.
     */
    async unwrapToNative(wallet: Wallet, amount?: bigint): Promise<void> {
        let amountDefined = this._isBigInt("amount", amount)
        if (amountDefined) {
            this._shouldBeNonnegativeInteger("amount", amount)
        }
        let cAddress = await this._getCAddress(wallet)
        if (!amountDefined) {
            amount = await this.getBalanceWrappedOnC(wallet.smartAccount ?? cAddress)
        }
        await this._cchain.tx.unwrap(wallet, cAddress, amount)
    }

    /**
     * Transfers wrapped wallet funds to a given recipient on the C-chain.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param recipient A C-chain address of the transfer recipient.
     * @param amount An amount in wei to be wrapped on the C-chain.
     */
    async transferWrapped(wallet: Wallet, recipient: string, amount: bigint): Promise<void> {
        this._shouldBeBigInt("amount", amount)
        this._shouldBeNonnegativeInteger("amount", amount)
        let cAddress = await this._getCAddress(wallet)
        await this._cchain.tx.transferWrapped(wallet, cAddress, recipient, amount)
    }

    /**
     * Claims or wraps entire claimable reward from staking.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param rewardOwner A C-chain address of the reward owner (optional, equal to the wallet's C-chain address by default).
     * @param recipient A C-chain address of the reward recipient (optional, equal to the wallet's C-chain address by default).
     * @param wrap A boolean indicating if the claimable amount is to be wrapped (optional, false by default).
     * @remarks If the wallet's C-chain address is different from the `rewardOwner`, it must be approved by the reward owner.
     */
    async claimStakingReward(wallet: Wallet, rewardOwner?: string, recipient?: string, wrap?: boolean): Promise<void> {
        let cAddress = await this._getCAddress(wallet)
        await this._cchain.tx.claimStakingReward(wallet, cAddress, rewardOwner ?? cAddress, recipient ?? cAddress, wrap ?? false)
    }

    /**
     * Claims or wraps entire claimable reward from FTSO delegation.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param rewardOwner A C-chain address of the reward owner (optional, equal to the wallet's C-chain address by default).
     * @param recipient A C-chain address of the reward recipient (optional, equal to the wallet's C-chain address by default).
     * @param wrap A boolean indicating if the claimable amount is to be wrapped (optional, false by default).
     * @param proofs An array of objects of type {@link FtsoRewardClaimWithProof} specifying the claims with Merkle proofs (optional).
     * @remarks If the wallet's C-chain address is different from the `rewardOwner`, it must be approved by the reward owner.
     */
    async claimFtsoReward(
        wallet: Wallet,
        rewardOwner?: string,
        recipient?: string,
        wrap?: boolean,
        proofs?: Array<FtsoRewardClaimWithProof>
    ): Promise<void> {
        let cAddress = await this._getCAddress(wallet)
        await this._cchain.tx.claimFtsoReward(wallet, cAddress, rewardOwner ?? cAddress, recipient ?? cAddress, wrap ?? false, proofs ?? [])
    }

    /**
     * Claims entire claimable reward from rNat projects to the rNat account corresponding to the
     * wallet's C-chain address.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param projectIds An array of project ids to claim for.
     */
    async claimRNatReward(wallet: Wallet, projectIds: Array<number>): Promise<void> {
        if (!Array.isArray(projectIds) || projectIds.length == 0) {
            throw new Error("The parameter projectIds should be a nonempty array")
        }
        for (let projectId of projectIds) {
            if (!Number.isSafeInteger(projectId) || projectId < 0) {
                throw new Error("The parameter projectIds should contain only nonnegative integers")
            }
        }
        let cAddress = await this._getCAddress(wallet)
        return this._cchain.tx.claimRNatReward(wallet, cAddress, projectIds)
    }

    /**
     * Withdraws unlocked wrapped funds from an rNat account to its owner.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param amount An amount in wei to be withdrawn from the rNat account associated with the wallet's C-chain address
     * (optional, entire unlocked wrapped rNat account balance by default).
     * @param wrap A boolean indicating if the withdrawn amount is to be wrapped (optional, false by default).
     */
    async withdrawFromRNatAccount(wallet: Wallet, amount?: bigint, wrap?: boolean): Promise<void> {
        let amountDefined = this._isBigInt("amount", amount)
        if (amountDefined) {
            this._shouldBeNonnegativeInteger("amount", amount)
        }
        let cAddress = await this._getCAddress(wallet)
        if (!amountDefined) {
            let balance = await this._cchain.getRNatAccountBalance(cAddress)
            amount = balance.wNatBalance - balance.lockedBalance
        }
        return this._cchain.tx.withdrawFromRNatAccount(wallet, cAddress, amount, wrap ?? false)
    }

    /**
     * Withdraws unlocked and locked wrapped funds from an rNat account to its owner.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     @param wrap A boolean indicating if the withdrawn amount is to be wrapped (optional, false by default).
     @remarks If some tokens are still locked, only 50% of them will be withdrawn, the rest will be burned as a penalty.
     */
    async withdrawAllFromRNatAccount(wallet: Wallet, wrap?: boolean): Promise<void> {
        let cAddress = await this._getCAddress(wallet)
        return this._cchain.tx.withdrawAllFromRNatAccount(wallet, cAddress, wrap ?? false)
    }

    /**
     * Returns the information about an existing Safe smart account.
     * @param address A C-chain address representing the smart account.
     * @returns An object of type {@link SafeSmartAccount}.
     */
    async getSafeSmartAccount(address: string): Promise<SafeSmartAccount> {
        return this._cchain.getSafeSmartAccountInfo(address)
    }

    /**
     * Creates a new Safe smart account and returns its address
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param owners An array of C-chain addresses representing the owners of the smart account.
     * @param threshold An integer representing the threshold of the smart account.
     * @returns A string representing the C-chain address of the smart account.
     */
    async createSafeSmartAccount(
        wallet: Wallet,
        owners: Array<string>,
        threshold: bigint
    ): Promise<string> {
        if (!Array.isArray(owners) || owners.length == 0) {
            throw new Error("The parameter owners should be a nonempty array")
        }
        owners.forEach((owner, i) => this._shouldBeCAddress(`owners[${i}]`, owner))
        owners = owners.map(owner => Account.normalizedCAddress(owner))
        if (new Set(owners).size !== owners.length) {
            throw new Error("The parameter owners should not contain duplicate addresses")
        }
        this._shouldBeBigInt("threshold", threshold)
        if (threshold < BigInt(1) || threshold > BigInt(owners.length)) {
            throw new Error(`Invalid threshold value, must be between 1 and ${owners.length}`)
        }
        let cAddress = await this._getCAddress(wallet)
        return this._cchain.tx.createSafeSmartAccount(wallet, cAddress, owners, threshold)
    }

    /**
     * Gets a list of foundation proposal ids.
     * @returns The array of integers representing the ids of the proposals.
     */
    async getFoundationProposalIds(): Promise<Array<bigint>> {
        return this._cchain.getFoundationProposalIds()
    }

    /**
     * Gets information about a specific foundation proposal.
     * @param proposalId An id of proposal.
     * @returns The object of type {@link FoundationProposalInfo} containing information about
     * the proposal with the given id.
     */
    async getFoundationProposalInfo(proposalId: bigint): Promise<FoundationProposalInfo> {
        return this._cchain.getFoundationProposalInfo(proposalId)
    }

    /**
     * Gets the governance vote power of a voter's vote for a given foundation proposal.
     * @param publicKeyOrAddress A public key or a C-chain address of the voter in hexadecimal encoding.
     * @param proposalId An integer representing the id of a foundation proposal.
     * @returns The integer representing the vote power.
     */
    async getVotePowerForFoundationProposal(publicKeyOrAddress: string, proposalId: bigint): Promise<bigint> {
        let cAddress = Account.isCAddress(publicKeyOrAddress) ?
            publicKeyOrAddress : Account.getCAddress(publicKeyOrAddress)
        return this._cchain.getVotePowerForFoundationProposal(cAddress, proposalId)
    }

    /**
     * Gets the delegate of a voter for a given foundation proposal, i.e., the address to which the voter's
     * governance vote power has been delegated at the vote power block of the foundation proposal.
     * @param publicKeyOrAddress A public key or a C-chain address of the voter in hexadecimal encoding.
     * @param proposalId An integer representing the id of a foundation proposal.
     * @returns A string representing the C-chain address of the delegate (zero address indicates no delegate).
     */
    async getVoteDelegateForFoundationProposal(publicKeyOrAddress: string, proposalId: bigint): Promise<string> {
        let cAddress = Account.isCAddress(publicKeyOrAddress) ?
            publicKeyOrAddress : Account.getCAddress(publicKeyOrAddress)
        return this._cchain.getVoteDelegateForFoundationProposal(cAddress, proposalId)
    }

    /**
     * Gets the current governance vote power of a voter's vote.
     * @param publicKeyOrAddress A public key or a C-chain address of the voter in hexadecimal encoding.
     * @returns The integer representing the vote power.
     */
    async getCurrentGovernanceVotePower(publicKeyOrAddress: string): Promise<bigint> {
        let cAddress = Account.isCAddress(publicKeyOrAddress) ?
            publicKeyOrAddress : Account.getCAddress(publicKeyOrAddress)
        return this._cchain.getCurrentGovernanceVotePower(cAddress)
    }

    /**
     * Gets the current delegate of a voter, i.e., the address to which the voter's governance vote power
     * is currently delegated.
     * @param publicKeyOrAddress A public key or a C-chain address of the voter in hexadecimal encoding.
     * @returns A string representing the C-chain address of the delegate (zero address indicates no delegate).
     */
    async getCurrentGovernanceVoteDelegate(publicKeyOrAddress: string): Promise<string> {
        let cAddress = Account.isCAddress(publicKeyOrAddress) ?
            publicKeyOrAddress : Account.getCAddress(publicKeyOrAddress)
        return this._cchain.getCurrentGovernanceVoteDelegate(cAddress)
    }

    /**
     * Returns a boolean indicating if a voter has cast vote for a given foundation proposal.
     * @param publicKeyOrAddress A public key or a C-chain address of the voter in hexadecimal encoding.
     * @param proposalId An integer representing the id of a foundation proposal.
     * @returns The boolean indicating if a voter has cast a vote.
     */
    async hasCastVoteForFoundationProposal(publicKeyOrAddress: string, proposalId: bigint): Promise<boolean> {
        let cAddress = Account.isCAddress(publicKeyOrAddress) ?
            publicKeyOrAddress : Account.getCAddress(publicKeyOrAddress)
        return this._cchain.hasCastVoteForFoundationProposal(cAddress, proposalId)
    }

    /**
     * Casts a vote for a foundation proposal.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param proposalId An integer representing the id of the foundation proposal.
     * @param support A value of enum {@link FoundationProposalSupport} representing the support.
     */
    async castVoteForFoundationProposal(
        wallet: Wallet,
        proposalId: bigint,
        support: FoundationProposalSupport
    ): Promise<void> {
        let cAddress = await this._getCAddress(wallet)
        return this._cchain.tx.castVoteForFoundationProposal(wallet, cAddress, proposalId, support)
    }

    /**
     * Delegates governance vote power to the provided delegate.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param delegate A C-chain address of the delegate in hexadecimal notation.
     */
    async delegateGovernanceVotePower(wallet: Wallet, delegate: string): Promise<void> {
        let cAddress = await this._getCAddress(wallet)
        return this._cchain.tx.delegateGovernanceVotePower(wallet, cAddress, delegate)
    }

    /**
     * Undelegates governance vote power.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     */
    async undelegateGovernanceVotePower(wallet: Wallet): Promise<void> {
        let cAddress = await this._getCAddress(wallet)
        return this._cchain.tx.undelegateGovernanceVotePower(wallet, cAddress)
    }

    /**
     * Submits Flare Data Connector (FDC) attestation request for EVM transaction.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param source An instance of the enum {@link FdcSourceNetwork} that determines the source network (ETH, FLR, or SGB) of the EVM transaction to attest.
     * @param transactionId Hash of the EVM transaction to attest.
     * @returns The instance of type {@link FdcAttestationRequest} that specifies the attestation request data.
     */
    async submitFdcAttestationRequestForEvmTransaction(
        wallet: Wallet,
        source: FdcSourceNetwork,
        transactionId: string
    ): Promise<FdcAttestationRequest> {
        let cAddress = await this._getCAddress(wallet)
        return this._cchain.tx.submitFdcAttestationRequestForEvmTransaction(
            wallet,
            cAddress,
            source,
            transactionId
        )
    }

    /**
     * Submits Flare Data Connector (FDC) attestation request for payment transaction.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param source An instance of the enum {@link FdcSourceNetwork} that determines the source network (BTC, DOGE, or XRP) of the payment transaction to attest.
     * @param transactionId Id of the payment transaction to attest.
     * @param senderUtxo Input index or address specifying the sender of the UTXO based payment transaction (optional, equal to 0 by default, relevant for BTC and DOGE)
     * @param recipientUtxo Output index or address specifying the recipient of the UTXO based payment transaction (optional, equal to 0 by default, relevant for BTC and DOGE)
     * @returns The instance of type {@link FdcAttestationRequest} that specifies the attestation request data.
     */
    async submitFdcAttestationRequestForPayment(
        wallet: Wallet,
        source: FdcSourceNetwork,
        transactionId: string,
        senderUtxo?: number | string,
        recipientUtxo?: number | string
    ): Promise<FdcAttestationRequest> {
        let cAddress = await this._getCAddress(wallet)
        return this._cchain.tx.submitFdcAttestationRequestForPayment(
            wallet,
            cAddress,
            source,
            transactionId,
            senderUtxo,
            recipientUtxo
        )
    }

    /**
     * Submits Flare Data Connector (FDC) attestation request for the validity of an address.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param source An instance of the enum {@link FdcSourceNetwork} that determines the source network (BTC, DOGE, or XRP) of the address to attest.
     * @param address Address to attest.
     * @returns The instance of type {@link FdcAttestationRequest} that specifies the attestation request data.
     */
    async submitFdcAttestationRequestForAddressValidity(
        wallet: Wallet,
        source: FdcSourceNetwork,
        address: string
    ): Promise<FdcAttestationRequest> {
        let cAddress = await this._getCAddress(wallet)
        return this._cchain.tx.submitFdcAttestationRequestForAddressValidity(
            wallet,
            cAddress,
            source,
            address
        )
    }

    /**
     * Submits Flare Data Connector (FDC) attestation request for Web2 Json API data.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param url URL of the data source.
     * @param httpMethod HTTP method to be used to fetch from URL source (GET, POST, PUT, PATCH, DELETE).
     * @param headers Headers to be included to fetch from URL source. Use '{}' if no headers are needed.
     * @param queryParams Query parameters to be included to fetch from URL source. Use '{}' if no query parameters are needed.
     * @param body Request body to be included to fetch from URL source. Use '{}' if no request body is required.
     * @param postProcessJq jq filter used to post-process the JSON response from the URL.
     * @param abiSignature ABI signature of the struct used to encode the data after jq post-processing.     
     * @returns The instance of type {@link FdcAttestationRequest} that specifies the attestation request data.
     * @remarks The request parameters are submitted to the network as public data. They should not
     * contain secrets, such as API keys in `headers`.
     */
    async submitFdcAttestationRequestForWeb2Json(
        wallet: Wallet,
        url: string,
        httpMethod: string,
        headers: string,
        queryParams: string,
        body: string,
        postProcessJq: string,
        abiSignature: string
    ): Promise<FdcAttestationRequest> {
        let cAddress = await this._getCAddress(wallet)
        return this._cchain.tx.submitFdcAttestationRequestForWeb2Json(
            wallet,
            cAddress,
            url,
            httpMethod,
            headers,
            queryParams,
            body,
            postProcessJq,
            abiSignature
        )
    }

    /**
     * Determines if the Flare Data Connector (FDC) voting round is finalized.
     * @param votingRoundId A number that specifies the voting round id.
     * @returns The boolean indicating if the voting round is finalized.
     * @remarks An error is thrown if `votingRoundId` is null, i.e., the attestation request was not submitted.
     */
    async isFdcVotingRoundFinalized(votingRoundId: number | null): Promise<boolean> {
        return this._cchain.isFdcVotingRoundFinalized(votingRoundId)
    }

    /**
     * Returns the Flare Data Connector (FDC) attestation.
     * @param request An instance of type {@link FdcAttestationRequest} specifying the submitted attestation request.
     * @returns The instance of type {@link FdcAttestation} specifying the attestation.
     */
    async getFdcAttestation(request: FdcAttestationRequest): Promise<FdcAttestation> {
        return this._cchain.getFdcAttestation(request)
    }

    /**
     * Verifies the Flare Data Connector (FDC) attestation.
     * @param attestation An instance of type {@link FdcAttestation} specifiyng the attestation.
     * @returns The boolean indicating if the attestation data (response) matches the attestation proof.
     */
    async verifyFdcAttestation(attestation: FdcAttestation): Promise<boolean> {
        return this._cchain.verifyFdcAttestation(attestation)
    }

    /**
     * Gets a list of all official Flare network contracts.
     * @returns The array of type {@link FlareContract}.
     */
    async getFlareContracts(): Promise<Array<FlareContract>> {
        return this._cchain.getFlareContracts()
    }

    /**
     * Invokes a method call on a specified EVM contract.
     * @param contract Contract address or a Flare network name.
     * @param abi Application binary interface corresponding to contract or method.
     * @param method Name of the method.
     * @param params Parameters of the method.
     * @returns The result of the call.
     */
    async invokeContractCallOnC(
        contract: string,
        abi: string,
        method: string,
        ...params: any[]
    ): Promise<any> {
        return this._cchain.invokeContractCall(contract, abi, method, ...params)
    }

    /**
     * Invokes a method transaction on a specified EVM contract.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param contract Contract address or a Flare network name.
     * @param abi Application binary interface corresponding to contract or method.
     * @param method Name of the method.
     * @param value Native coin value to send in the transaction.
     * @param params Parameters of the method.
     */
    async invokeContractMethodOnC(
        wallet: Wallet,
        contract: string,
        abi: string,
        method: string,
        value: bigint,
        ...params: any[]
    ): Promise<void> {
        if (this._isBigInt("value", value)) {
            this._shouldBeNonnegativeInteger("value", value)
        } else {
            value = BigInt(0)
        }
        let cAddress = await this._getCAddress(wallet)
        await this._cchain.tx.invokeContractMethod(wallet, cAddress, contract, abi, method, value, ...params)
    }

    /**
     * Transfers wallet funds from the C-chain to the P-chain.
     * @remarks The transfer generally requires two transactions:
     * export from the C-chain and import to the P-chain.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getPublicKey`, and
     * - the function `signPTransaction`, `signDigest` or `signEthMessage`.
     * @param amount An amount in wei to be transferred to the P-chain.
     * @param allocatedFeeOnP An amount in wei specifying the allocated fee for import to the P-chain.
     * If the amount is not provided, the default fee allocation value is used.
     */
    async transferToP(wallet: Wallet, amount: bigint, allocatedFeeOnP?: bigint): Promise<void> {
        this._shouldBeBigInt("amount", amount)
        this._shouldBePositiveInteger("amount", amount)
        this._shouldBeGweiInteger("amount", amount)

        if (!this._isBigInt("allocatedFeeOnP", allocatedFeeOnP)) {
            allocatedFeeOnP = this._core.const.pvmAllocatedFee
        }
        this._shouldBePositiveInteger("allocatedFeeOnP", allocatedFeeOnP)
        this._shouldBeGweiInteger("allocatedFeeOnP", allocatedFeeOnP)

        let account = await this._getAccount(wallet)

        let notImportedToP = await this._pchain.getBalanceNotImportedToP(account.pAddress)
        if (notImportedToP < amount + allocatedFeeOnP) {
            let amountToExport = amount + allocatedFeeOnP - notImportedToP
            await this._cchain.tx.exportFromC(wallet, account, amountToExport)
            notImportedToP = await this._pchain.getBalanceNotImportedToP(account.pAddress)
        }

        if (notImportedToP < amount) {
            throw new Error("The balance exported from C-chain is not sufficient to transfer the required amount to P-chain")
        }

        if (notImportedToP > 0) {
            await this._pchain.tx.importToP(wallet, account)
        }
    }

    /**
     * Transfers wallet funds from the P-chain to the C-chain.
     * @remarks The transfer generally requires two transactions:
     * export from the P-chain and import to the C-chain.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getPublicKey`, and
     * - the function `signPTransaction`, `signDigest` or `signEthMessage`.
     * @param amount An amount in wei to be transferred to the C-chain.
     * Note that this amount is reduced by the C-chain transaction fee.
     * If the amount is not given, all available balance on the P-chain is transferred.
     */
    async transferToC(wallet: Wallet, amount?: bigint): Promise<void> {
        let amountDefined = this._isBigInt("amount", amount)
        if (amountDefined) {
            this._shouldBePositiveInteger("amount", amount)
            this._shouldBeGweiInteger("amount", amount)
        }

        let account = await this._getAccount(wallet)

        let amountToExport: bigint
        if (amountDefined) {
            let notImportedToC = await this._cchain.getBalanceNotImportedToC(account.pAddress)
            amountToExport = amount - notImportedToC
        } else {
            let balance = await this._pchain.getBalance(account.pAddress)
            let exportFee = this._core.const.pvmAllocatedFee
            amountToExport = balance - exportFee
        }
        if (amountToExport > BigInt(0)) {
            await this._pchain.tx.exportFromP(wallet, account, amountToExport)
        }

        let notImportedToC = await this._cchain.getBalanceNotImportedToC(account.pAddress)
        if (amountDefined && notImportedToC < amount) {
            throw new Error("The balance exported from P-chain is not sufficient to transfer the required amount to C-chain")
        }
        if (notImportedToC > BigInt(0)) {
            await this._cchain.tx.importToC(wallet, account)
        }
    }

    /**
     * Exports wallet funds from the C-chain address.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getPublicKey`, and
     * - the function `signPTransaction`, `signDigest` or `signEthMessage`.
     * @param amount An amount in wei to be exported.
     * @param baseFee A base C-chain transaction fee in wei to be used for transaction (optional).
     */
    async exportFromC(wallet: Wallet, amount: bigint, baseFee?: bigint): Promise<void> {
        this._shouldBeBigInt("amount", amount)
        this._shouldBePositiveInteger("amount", amount)
        this._shouldBeGweiInteger("amount", amount)
        if (this._isBigInt("baseFee", baseFee)) {
            this._shouldBePositiveInteger("baseFee", baseFee)
            this._shouldBeGweiInteger("baseFee", baseFee)
        }
        let account = await this._getAccount(wallet)
        await this._cchain.tx.exportFromC(wallet, account, amount, baseFee)
    }

    /**
     * Imports all unimported wallet funds to the C-chain address.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getPublicKey`, and
     * - the function `signPTransaction`, `signDigest` or `signEthMessage`.
     * @param baseFee A base C-chain transaction fee in wei to be used for transaction (optional).
     */
    async importToC(wallet: Wallet, baseFee?: bigint): Promise<void> {
        if (this._isBigInt("baseFee", baseFee)) {
            this._shouldBePositiveInteger("baseFee", baseFee)
            this._shouldBeGweiInteger("baseFee", baseFee)
        }
        let account = await this._getAccount(wallet)
        await this._cchain.tx.importToC(wallet, account, baseFee)
    }

    /**
     * Transfers wallet funds on the P-chain from one address to another.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getPublicKey`, and
     * - the function `signPTransaction`, `signDigest` or `signEthMessage`.
     * @param recipient The P-chain address of the recipient in bech32 encoding.
     * @param amount An amount in wei to be transferred.
     * If amount is not provided, the entire P-chain balance of the wallet is transferred.
     */
    async transferOnP(wallet: Wallet, recipient: string, amount?: bigint): Promise<void> {
        if (typeof recipient !== "string" || !Account.isPAddress(recipient, this._core.hrp)) {
            throw new Error(`The parameter recipient should be a P-chain address in bech32 encoding with prefix ${this._core.hrp}`)
        }
        recipient = Account.normalizePAddress(recipient, this._core.hrp)
        if (this._isBigInt("amount", amount)) {
            this._shouldBePositiveInteger("amount", amount)
            this._shouldBeGweiInteger("amount", amount)
        }
        let account = await this._getAccount(wallet)
        await this._pchain.tx.transfer(wallet, account, recipient, amount)
    }

    /**
     * Exports wallet funds from the P-chain address.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getPublicKey`, and
     * - the function `signPTransaction`, `signDigest` or `signEthMessage`.
     * @param amount An amount in wei to be exported.
     */
    async exportFromP(wallet: Wallet, amount: bigint): Promise<void> {
        this._shouldBeBigInt("amount", amount)
        this._shouldBePositiveInteger("amount", amount)
        this._shouldBeGweiInteger("amount", amount)
        let account = await this._getAccount(wallet)
        await this._pchain.tx.exportFromP(wallet, account, amount)
    }

    /**
     * Imports all unimported wallet funds to the P-chain address.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getPublicKey`, and
     * - the function `signPTransaction`, `signDigest` or `signEthMessage`.
     */
    async importToP(wallet: Wallet): Promise<void> {
        let account = await this._getAccount(wallet)
        await this._pchain.tx.importToP(wallet, account)
    }

    /**
     * Delegates wallet funds on the P-chain.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getPublicKey`, and
     * - the function `signPTransaction`, `signDigest` or `signEthMessage`.
     * @param amount The amount in wei to be delegated.
     * @param nodeId The code of the validator's node to delegate to.
     * @param startTime The seconds from the Unix epoch marking the start of the delegation.
     * If the value is not provided, it is set to the current time plus 60 seconds.
     * @param endTime The seconds from the Unix epoch marking the end of the delegation.
     * If the value is not provided, it is set to be equal to the validator's end time.
     * @param allocatedFeeOnP An amount in wei specifying the allocated fee for import to and delegate on
     * the P-chain. If the amount is not provided, the default fee allocation value is used.
     */
    async delegateOnP(
        wallet: Wallet,
        amount: bigint,
        nodeId: string,
        startTime?: bigint,
        endTime?: bigint,
        allocatedFeeOnP?: bigint
    ): Promise<void> {
        this._shouldBeBigInt("amount", amount)
        this._shouldBePositiveInteger("amount", amount)
        this._shouldBeGweiInteger("amount", amount)
        if (!this._isBigInt("startTime", startTime)) {
            startTime = BigInt(Math.floor(Date.now() / 1000) + 60)
        }
        this._shouldBePositiveInteger("startTime", startTime)
        if (!this._isBigInt("endTime", endTime)) {
            let validators = await this._pchain.getValidators()
            let validator = validators.find(v => v.nodeId === nodeId)
            if (!validator) {
                throw new Error("Validator with the specified node id does not exist")
            }
            endTime = validator.endTime
        }
        this._shouldBePositiveInteger("endTime", endTime)
        if (endTime <= startTime) {
            throw new Error("The delegation end time must be after the start time")
        }
        if (!this._isBigInt("allocatedFeeOnP", allocatedFeeOnP)) {
            allocatedFeeOnP = this._core.const.pvmAllocatedFee
        }
        this._shouldBePositiveInteger("allocatedFeeOnP", allocatedFeeOnP)
        this._shouldBeGweiInteger("allocatedFeeOnP", allocatedFeeOnP)

        let account = await this._getAccount(wallet)

        let balanceOnP = await this._pchain.getBalance(account.pAddress)
        if (balanceOnP < amount + allocatedFeeOnP) {
            await this.transferToP(wallet, amount - balanceOnP + allocatedFeeOnP, allocatedFeeOnP)
        }

        await this._pchain.tx.delegateOnP(wallet, account, amount, nodeId, startTime, endTime)
    }

    /**
     * Adds validator on the P-chain.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getPublicKey`, and
     * - the function `signPTransaction`, `signDigest` or `signEthMessage`.
     * @param amount The amount in wei to be delegated.
     * @param nodeId The code of the validator's node.
     * @param startTime The seconds from the Unix epoch marking the start of the delegation.
     * @param endTime The seconds from the Unix epoch marking the end of the delegation.
     * @param delegationFee The percentage in base points that corresponds to the fee the validator charges
     * to delegators.
     * @param popBLSPublicKey The public key in hexadecimal notation for the proof of possesion of the BLS key.
     * @param popBLSSignature The signature in hexadecimal notation for the proof of possesion of the BLS key.
     */
    async addValidatorOnP(
        wallet: Wallet,
        amount: bigint,
        nodeId: string,
        startTime: bigint,
        endTime: bigint,
        delegationFee: bigint,
        popBLSPublicKey: string,
        popBLSSignature: string
    ): Promise<void> {
        this._shouldBeBigInt("amount", amount)
        this._shouldBePositiveInteger("amount", amount)
        this._shouldBeGweiInteger("amount", amount)
        this._shouldBeBigInt("startTime", startTime)
        this._shouldBePositiveInteger("startTime", startTime)
        this._shouldBeBigInt("endTime", endTime)
        this._shouldBePositiveInteger("endTime", endTime)
        if (endTime <= startTime) {
            throw new Error("The staking end time must be after the start time")
        }
        this._shouldBeBigInt("delegationFee", delegationFee)
        if (delegationFee < BigInt(0) || delegationFee > BigInt(10000)) {
            throw new Error("The parameter delegationFee must be a value between 0 and 10000")
        }
        let account = await this._getAccount(wallet)
        await this._pchain.tx.addValidatorOnP(
            wallet,
            account,
            amount,
            nodeId,
            startTime,
            endTime,
            delegationFee,
            popBLSPublicKey,
            popBLSSignature
        )
    }

    /**
     * Delegates vote power to FTSO providers on the C-chain.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param delegate1 A C-chain address representing the first FTSO delegate.
     * @param shareBP1 A share of vote power in base points to delegate to the first delegate.
     * @param delegate2 A C-chain address representing the second FTSO delegate (optional).
     * @param shareBP2 A share of vote power in base points to delegate to the second delegate (optional).
     * @remark The shares are specified in units between 0 and 10000 with a unit representing 0.01%.
     * The sum of `shareBP1` and `shareBP2` should not be larger than 10000.
     * The transaction invoked by this call undelegates all previous delegations.
     */
    async delegateToFtso(
        wallet: Wallet,
        delegate1: string,
        shareBP1: bigint,
        delegate2?: string,
        shareBP2?: bigint
    ): Promise<void> {
        this._shouldBeCAddress("delegate1", delegate1)
        this._shouldBeBigInt("shareBP1", shareBP1)
        this._shouldBePositiveInteger("shareBP1", shareBP1)
        if (shareBP1 > BigInt(10000)) {
            throw new Error("The parameter shareBP1 should not be larger than 10000")
        }
        let shareBP2Defined = this._isBigInt("shareBP2", shareBP2)
        if (delegate2 && !shareBP2Defined) {
            throw new Error("The parameter delegate2 is defined but the parameter shareBP2 is not")
        }
        if (shareBP2Defined) {
            if (!delegate2) {
                throw new Error("The parameter shareBP2 is defined but the parameter delegate2 is not")
            }
            this._shouldBeCAddress("delegate2", delegate2)
            if (Account.normalizedCAddress(delegate1) === Account.normalizedCAddress(delegate2)) {
                throw new Error("The parameters delegate1 and delegate2 should be different addresses")
            }
            this._shouldBePositiveInteger("shareBP2", shareBP2)
            if (shareBP1 + shareBP2 > BigInt(10000)) {
                throw new Error("The sum of parameters shareBP1 and shareBP2 should not be larger than 10000")
            }
        }
        let cAddress = await this._getCAddress(wallet)
        let delegates = new Array<string>()
        let sharesBP = new Array<bigint>()
        delegates.push(delegate1)
        sharesBP.push(shareBP1)
        if (delegate2 && shareBP2Defined) {
            delegates.push(delegate2)
            sharesBP.push(shareBP2)
        }
        await this._cchain.tx.delegateToFtso(wallet, cAddress, delegates, sharesBP)
    }

    /**
     * Undelegates vote power from FTSO providers on the C-chain.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     */
    async undelegateFromFtso(wallet: Wallet): Promise<void> {
        let cAddress = await this._getCAddress(wallet)
        await this._cchain.tx.undelegateFromFtso(wallet, cAddress)
    }

    /**
     * Returns the number of the current block on the C-chain.
     * @returns Block number.
     */
    async getCurrentBlockOnC(): Promise<number> {
        return this._cchain.getCurrentBlock()
    }

    /**
     * Returns the current base fee rate on the C-chain.
     * @returns The base fee rate in wei per unit of transaction size.
     */
    async getBaseTxFeeOnC(): Promise<bigint> {
        return this._cchain.tx.getBaseFee()
    }

    /**
     * Returns the current base fee rate on the P-chain.
     * @returns The base fee rate in wei per unit of transaction size.
     */
    async getBaseTxFeeOnP(): Promise<bigint> {
        return this._pchain.tx.getBaseTxFee()
    }

    /**
     * Returns the fee amount reserved by default to cover a P-chain transaction.
     * @returns The allocated fee in wei.
     */
    async getDefaultAllocatedFeeOnP(): Promise<bigint> {
        return this._core.const.pvmAllocatedFee
    }

    /**
     * Returns the network identifier (human-readable part).
     * @returns The string identifier.
     */
    getHrp(): string {
        return this._core.hrp
    }

    /**
     * Sets the node's RPC address used for connecting to the blockchains.
     * @param rpc RPC address.
     */
    setRpc(rpc: string): void {
        this._core.rpc = rpc
    }

    /**
     * Sets the callback that is invoked before each transaction signature request.
     * @param callback The callback function of type {@link BeforeTxSignatureCallback}.
     * Use `null` to remove the callback.
     */
    setBeforeTxSignatureCallback(callback: BeforeTxSignatureCallback): void {
        this._core.beforeTxSignature = callback
    }

    /**
     * Sets the callback that is invoked before each transaction submission to the network.
     * @param callback The callback function of type {@link BeforeTxSubmissionCallback}.
     * Use `null` to remove the callback.
     */
    setBeforeTxSubmissionCallback(callback: BeforeTxSubmissionCallback): void {
        this._core.beforeTxSubmission = callback
    }

    /**
     * Sets the callback that is invoked after each transaction submission to the network.
     * @param callback The callback function of type {@link AfterTxSubmissionCallback}.
     * Use `null` to remove the callback.
     */
    setAfterTxSubmissionCallback(callback: AfterTxSubmissionCallback): void {
        this._core.afterTxSubmission = callback
    }

    /**
     * Sets the callback that is invoked after each transaction confirmation to the network.
     * @param callback The callback function of type {@link AfterTxConfirmationCallback}.
     * Use `null` to remove the callback.
     */
    setAfterTxConfirmationCallback(callback: AfterTxConfirmationCallback): void {
        this._core.afterTxConfirmation = callback
    }

    private async _getCAddress(wallet: Wallet): Promise<string> {
        if (wallet.getCAddress) {
            return Account.normalizedCAddress(await wallet.getCAddress())
        } else if (wallet.getPublicKey) {
            let publicKey = await wallet.getPublicKey()
            return Account.getCAddress(publicKey)
        } else {
            throw new Error("The wallet should implement the function `getCAddress` or `getPublicKey`")
        }
    }

    private async _getAccount(wallet: Wallet): Promise<Account> {
        if (wallet.getPublicKey) {
            let publicKey = await wallet.getPublicKey()
            return new Account(publicKey, this._core.hrp)
        } else {
            throw new Error("The wallet should implement the function `getPublicKey`")
        }
    }

    private _isBigInt(name: string, value?: bigint): boolean {
        if (typeof value === "bigint") {
            return true
        } else if (value === undefined || value === null) {
            return false
        } else {
            throw new Error(`The parameter ${name} should be a bigint value or undefined`)
        }
    }

    private _shouldBeBigInt(name: string, value: bigint): void {
        if (typeof value !== "bigint") {
            throw new Error(`The parameter ${name} should be a bigint value`)
        }
    }

    private _shouldBeCAddress(name: string, value: string): void {
        if (typeof value !== "string" || !Account.isCAddress(value)) {
            throw new Error(`The parameter ${name} should be a C-chain address in hexadecimal encoding`)
        }
    }

    private _shouldBeGweiInteger(name: string, value: bigint): void {
        if (value % BigInt(1e9) !== BigInt(0)) {
            throw new Error(`The wei value of the parameter ${name} should be a multiple of 1e9 (an integer in gwei units)`)
        }
    }

    private _shouldBePositiveInteger(name: string, value: bigint): void {
        if (value <= BigInt(0)) {
            throw new Error(`The parameter ${name} should be a positive integer`)
        }
    }

    private _shouldBeNonnegativeInteger(name: string, value: bigint): void {
        if (value < BigInt(0)) {
            throw new Error(`The parameter ${name} should be a nonnegative integer`)
        }
    }

}