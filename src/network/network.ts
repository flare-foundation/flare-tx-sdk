import { Wallet } from "../wallet"
import { Account } from "./account"
import { CChain } from "./cchain"
import { NetworkCore, NetworkBased } from "./core"
import { PChain } from "./pchain"
import { AfterTxSubmissionCallback, BeforeTxSignatureCallback, BeforeTxSubmissionCallback } from "./callback"
import { Constants } from "./constants"
import { Balance, FtsoDelegate as FtsoDelegate, FtsoRewardClaimWithProof, FtsoRewardState, Stake } from "./iotype"
import { FlareContract } from "./contract"

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
     * Returns balance on the P-chain.
     * @param publicKey A public key in hexadecimal encoding.
     * @returns The balance in wei corresponding to the public key.
     */
    async getBalanceOnP(publicKey: string): Promise<bigint> {
        let pAddress = Account.getPAddress(publicKey, this._core.hrp)
        return this._pchain.getBalance(pAddress)
    }

    /**
     * Returns balance not imported to the C-chain.
     * @param publicKey A public key in hexadecimal encoding.
     * @returns The balance in wei corresponding to the public key.
     */
    async getBalanceNotImportedToC(publicKey: string): Promise<bigint> {
        let pAddress = Account.getPAddress(publicKey, this._core.hrp)
        return this._cchain.getBalanceNotImportedToC(pAddress)
    }

    /**
     * Returns balance not imported to the P-chain.
     * @param publicKey A public key in hexadecimal encoding.
     * @returns The balance in wei corresponding to the public key.
     */
    async getBalanceNotImportedToP(publicKey: string): Promise<bigint> {
        let pAddress = Account.getPAddress(publicKey, this._core.hrp)
        return this._pchain.getBalanceNotImportedToP(pAddress)
    }

    /**
     * Returns balance staked on the P-chain.
     * @param publicKey A public key in hexadecimal encoding.
     * @returns The balance in wei corresponding to the public key.
     */
    async getBalanceStakedOnP(publicKey: string): Promise<bigint> {
        let pAddress = Account.getPAddress(publicKey, this._core.hrp)
        return this._pchain.getStakedBalance(pAddress)
    }

    /**
     * Returns information about stakes on the P-chain.
     * @param publicKey A public key in hexadecimal encoding (optional).
     * @returns The array of stakes on the P-chain
     * (corresponding to the given public key if given).
     */
    async getStakesOnP(publicKey?: string): Promise<Array<Stake>> {
        if (publicKey) {
            let pAddress = Account.getPAddress(publicKey, this._core.hrp)
            return this._pchain.getStakesOf(pAddress)
        } else {
            return this._pchain.getStakes()
        }
    }

    /**
     * Returns the amount of claimable reward from FlareDrop.
     * @param publicKeyOrAddress A public key or a C-chain address in hexadecimal encoding.
     * @returns The reward in wei corresponding to the public key or address.
     */
    async getClaimableFlareDropReward(publicKeyOrAddress: string): Promise<bigint> {
        let cAddress = Account.isCAddress(publicKeyOrAddress) ?
            publicKeyOrAddress : Account.getCAddress(publicKeyOrAddress)
        return this._cchain.getClaimableFlareDropReward(cAddress)
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
     * Transfers wallet funds to a given recipient on the C-chain.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param recipient A C-chain address of the transfer recipient.
     * @param amount An amount in wei to be wrapped on the C-chain.
     */
    async transferNative(wallet: Wallet, recipient: string, amount: bigint): Promise<void> {
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
        let cAddress = await this._getCAddress(wallet)
        amount = amount ?? await this.getBalanceWrappedOnC(cAddress)
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
        let cAddress = await this._getCAddress(wallet)
        await this._cchain.tx.transferWrapped(wallet, cAddress, recipient, amount)
    }

    /**
     * Claims or wraps entire claimable reward from FlareDrop.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getCAddress` or `getPublicKey`, and
     * - the function `signCTransaction`, `signAndSubmitCTransaction` or `signDigest`.
     * @param rewardOwner A C-chain address of the reward owner (optional, equal to the wallet's C-chain address by default).
     * @param recipient A C-chain address of the reward recipient (optional, equal to the wallet's C-chain address by default).
     * @param wrap A boolean indicating if the claimable amount is to be wrapped (optional, false by default).
     * @remarks If the wallet's C-chain address is different from the `rewardOwner`, it must be approved by the reward owner.
     */
    async claimFlareDropReward(wallet: Wallet, rewardOwner?: string, recipient?: string, wrap?: boolean): Promise<void> {
        let cAddress = await this._getCAddress(wallet)
        await this._cchain.tx.claimFlareDropReward(wallet, cAddress, rewardOwner ?? cAddress, recipient ?? cAddress, wrap ?? false)
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
     */
    async transferToP(wallet: Wallet, amount: bigint): Promise<void> {
        this._shouldBeGweiInteger(amount)
        let account = await this._getAccount(wallet)

        let importFee = this.getDefaultTxFeeOnP()
        let notImportedToP = await this._pchain.getBalanceNotImportedToP(account.pAddress)
        if (notImportedToP < amount + importFee) {
            let amountToExport = amount + importFee - notImportedToP
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
        let account = await this._getAccount(wallet)

        let amountToExport: bigint
        if (amount) {
            this._shouldBeGweiInteger(amount)
            let notImportedToC = await this._cchain.getBalanceNotImportedToC(account.pAddress)
            amountToExport = amount - notImportedToC
        } else {
            let balance = await this._pchain.getBalance(account.pAddress)
            let exportFee = this.getDefaultTxFeeOnP()
            amountToExport = balance - exportFee
        }
        if (amountToExport > BigInt(0)) {
            await this._pchain.tx.exportFromP(wallet, account, amountToExport)
        }

        let notImportedToC = await this._cchain.getBalanceNotImportedToC(account.pAddress)
        if (amount && notImportedToC < amount) {
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
     * @param amount An amount in qwei to be exported.
     * @param baseFee A base C-chain transaction fee in wei to be used for transaction (optional).
     */
    async exportFromC(wallet: Wallet, amount: bigint, baseFee?: bigint): Promise<void> {
        this._shouldBeGweiInteger(amount)
        if (baseFee) {
            this._shouldBeGweiInteger(baseFee)
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
        if (baseFee) {
            this._shouldBeGweiInteger(baseFee)
        }
        let account = await this._getAccount(wallet)
        await this._cchain.tx.importToC(wallet, account, baseFee)
    }

    /**
     * Exports wallet funds from the P-chain address.
     * @param wallet An instance of the class implementing the interface {@link Wallet} that contains:
     * - the function `getPublicKey`, and
     * - the function `signPTransaction`, `signDigest` or `signEthMessage`.
     * @param amount An amount in qwei to be exported.
     */
    async exportFromP(wallet: Wallet, amount: bigint): Promise<void> {
        this._shouldBeGweiInteger(amount)
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
     * @param endTime The seconds from the Unix epoch marking the end of the delegation.
     */
    async delegateOnP(
        wallet: Wallet,
        amount: bigint,
        nodeId: string,
        startTime: bigint,
        endTime: bigint
    ): Promise<void> {
        this._shouldBeGweiInteger(amount)
        await this._cchain.verifyStakeParameters(amount, startTime, endTime)
        let account = await this._getAccount(wallet)

        let balanceOnP = await this._pchain.getBalance(account.pAddress)
        if (balanceOnP < amount) {
            await this.transferToP(wallet, amount - balanceOnP)
        }

        await this._pchain.tx.delegateOnP(wallet, account, amount, nodeId, startTime, endTime)
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
        let cAddress = await this._getCAddress(wallet)
        let delegates = new Array<string>()
        let sharesBP = new Array<bigint>()
        delegates.push(delegate1)
        sharesBP.push(shareBP1)
        if (delegate2 && shareBP2) {
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
     * Returns the current base transaction fee on the C-chain.
     * @returns The base fee in wei.
     */
    async getBaseTxFeeOnC(): Promise<bigint> {
        return this._cchain.tx.getBaseFee()
    }

    /**
     * Returns the default transaction fee on the P-chain
     * @returns The default fee in wei.
     */
    getDefaultTxFeeOnP(): bigint {
        return this._pchain.tx.getDefaultTxFee()
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

    private async _getCAddress(wallet: Wallet): Promise<string> {
        if (wallet.getCAddress) {
            return wallet.getCAddress()
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

    private _shouldBeGweiInteger(amount: bigint): void {
        if (amount % BigInt(1e9) != BigInt(0)) {
            throw Error("The input wei amount should be a multiple of 1e9 (an integer in gwei units)")
        }
    }

}