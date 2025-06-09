import { Export } from "./export";
import { Import } from "./import";
import { NetworkCore, NetworkBased } from "../../core";
import { Account } from "../../account";
import { Signature } from "../../sign";
import { Utils } from "../../utils";
import { TxType } from "../../txtype";
import { Wallet } from "../../../wallet";
import { ethers, Transaction as EvmTx, TransactionReceipt } from "ethers";
import { EVMUnsignedTx as AvaxTx, messageHashFromUnsignedTx, utils as futils } from "@flarenetwork/flarejs"
import { Transfer } from "./transfer";
import { ContractRegistry } from "../contract/registry";
import { GenericContract } from "../contract/generic";
import { Constants } from "../../constants";
import { FtsoRewardClaimWithProof } from "src/network/iotype";
import { base58 } from "@scure/base";
import { SafeProxyFactory } from "../contract/safe_proxy_factory";

export class Transactions extends NetworkBased {

    constructor(network: NetworkCore, registry: ContractRegistry) {
        super(network)
        this._registry = registry
        this._transfer = new Transfer(network)
        this._export = new Export(network)
        this._import = new Import(network)
    }

    private _registry: ContractRegistry
    private _transfer: Transfer
    private _export: Export
    private _import: Import

    async transfer(
        wallet: Wallet, cAddress: string, recipient: string, amount?: bigint
    ): Promise<void> {
        let unsignedTx: EvmTx
        if (amount) {
            unsignedTx = await this._transfer.getTx(cAddress, recipient, amount)
        } else {
            let balance = await this._core.ethers.getBalance(cAddress)
            unsignedTx = await this._transfer.getWipeTx(cAddress, recipient, balance)
        }
        await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.TRANSFER_NAT)
    }

    async wrap(wallet: Wallet, cAddress: string, amount: bigint): Promise<void> {
        let wnat = await this._registry.getWNat()
        let unsignedTx = await wnat.getWrapTx(cAddress, amount)
        await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.WRAP_NAT)
    }

    async unwrap(wallet: Wallet, cAddress: string, amount: bigint): Promise<void> {
        let wnat = await this._registry.getWNat()
        let unsignedTx = await wnat.getUnwrapTx(cAddress, amount)
        await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.UNWRAP_NAT)
    }

    async transferWrapped(
        wallet: Wallet, cAddress: string, recipient: string, amount: bigint
    ): Promise<void> {
        let wnat = await this._registry.getWNat()
        let unsignedTx = await wnat.getTransferTx(cAddress, recipient, amount)
        await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.TRANSFER_NAT)
    }

    async claimFlareDropReward(
        wallet: Wallet, cAddress: string, rewardOwner: string, recipient: string, wrap: boolean
    ): Promise<void> {
        let flareDrop = await this._registry.getFlareDropDistribution()
        let claimableMonths = await flareDrop.getClaimableMonths()
        let lastClaimableMonth = claimableMonths[1]
        let unsignedTx = await flareDrop.claim(cAddress, rewardOwner, recipient, lastClaimableMonth, wrap)
        await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.CLAIM_REWARD_FLAREDROP)
    }

    async claimStakingReward(
        wallet: Wallet, cAddress: string, rewardOwner: string, recipient: string, wrap: boolean
    ): Promise<void> {
        let manager = await this._registry.getValidatorRewardManager()
        let state = await manager.getStateOfRewards(rewardOwner)
        let rewardAmount = state[0] - state[1]
        let unsignedTx = await manager.claim(cAddress, rewardOwner, recipient, rewardAmount, wrap)
        await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.CLAIM_REWARD_STAKING)
    }

    async claimFtsoReward(
        wallet: Wallet,
        cAddress: string,
        rewardOwner: string,
        recipient: string,
        wrap: boolean,
        proofs: Array<FtsoRewardClaimWithProof>
    ): Promise<void> {
        let manager = await this._registry.getRewardManager()
        let rewardEpochId: bigint
        if (proofs.length == 0) {
            let states = await manager.getStateOfRewards(rewardOwner)
            rewardEpochId = BigInt(-1)
            for (let epochStates of states) {
                if (epochStates.length == 0) {
                    continue
                }
                if (epochStates.some(s => !s.initialised)) {
                    break
                }
                rewardEpochId = epochStates[0].rewardEpochId
            }
            if (rewardEpochId < BigInt(0)) {
                throw new Error("The reward owner has no claimable rewards in initialised reward epochs")
            }
        } else {
            rewardEpochId = proofs.reduce((v, p) => { let id = p.body.rewardEpochId; return id > v ? id : v }, BigInt(0))
        }
        let unsignedTx = await manager.claim(cAddress, rewardOwner, recipient, rewardEpochId, wrap, proofs)
        await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.CLAIM_REWARD_FTSO)
    }

    async delegateToFtso(
        wallet: Wallet, cAddress: string, delegates: Array<string>, sharesBP: Array<bigint>
    ): Promise<void> {
        let wnat = await this._registry.getWNat()
        if (this._core.hrp === Constants.SONGBIRD.hrp || this._core.hrp === Constants.COSTON.hrp) {
            let current = await wnat.delegatesOf(cAddress)
            if (current.length > 0) {
                await this.undelegateFromFtso(wallet, cAddress)
            }
            for (let i = 0; i < delegates.length; i++) {
                let unsignedTx = await wnat.getDelegateTx(cAddress, delegates[i], sharesBP[i])
                await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.DELEGATE_FTSO)
            }
        } else {
            let unsignedTx = await wnat.getBatchDelegateTx(cAddress, delegates, sharesBP)
            await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.DELEGATE_FTSO)
        }
    }

    async undelegateFromFtso(wallet: Wallet, cAddress: string): Promise<void> {
        let wnat = await this._registry.getWNat()
        let unsignedTx = await wnat.getUndelegateTx(cAddress)
        await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.UNDELEGATE_FTSO)
    }

    async createSafeSmartAccount(wallet: Wallet, cAddress: string, owners: Array<string>, threshold: bigint): Promise<string> {
        let proxyFactory = new SafeProxyFactory(this._core, this._core.const.address_SafeProxyFactory)
        let singleton = this._core.const.address_SafeSingleton
        let fallbackHandler = this._core.const.address_SafeFallbackHandler
        let saltNonce = BigInt(Math.floor(Math.random() * 1e6))
        let unsignedTx = await proxyFactory.getCreatProxyTx(cAddress, singleton, owners, threshold, fallbackHandler, saltNonce)
        let receipt = await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.CREATE_SAFE_SMART_ACCOUNT)
        return receipt.logs[0].address
    }

    async invokeContractMethod(
        wallet: Wallet,
        cAddress: string,
        contract: string,
        abi: string,
        method: string,
        value: bigint,
        ...params: any[]
    ): Promise<void> {
        let contractAddress = Account.isCAddress(contract) ? contract : await this._registry.getAddress(contract)
        let generic = new GenericContract(this._core, contractAddress)
        let unsignedTx = await generic.getTx(cAddress, abi, method, value, ...params)
        await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.CUSTOM_CONTRACT_C)
    }

    async exportFromC(
        wallet: Wallet,
        account: Account,
        amount: bigint,
        baseFee?: bigint
    ): Promise<void> {
        baseFee = baseFee ?? await this.getBaseFee()
        let unsignedTx = await this._export.getTx(account.cAddress, account.pAddress, amount, baseFee)
        await this._signAndSubmitAvaxTx(wallet, account, unsignedTx, TxType.EXPORT_C)
    }

    async importToC(
        wallet: Wallet,
        account: Account,
        baseFee?: bigint
    ): Promise<void> {
        baseFee = baseFee ?? await this.getBaseFee()
        let unsignedTx = await this._import.getTx(account.cAddress, account.pAddress, baseFee)
        await this._signAndSubmitAvaxTx(wallet, account, unsignedTx, TxType.IMPORT_C)
    }

    async getBaseFee(): Promise<bigint> {
        let feeData = await this._core.ethers.getFeeData()
        let gasPrice = feeData.gasPrice ?? this._core.const.evmBaseFee
        let gwei = BigInt(1e9)
        let up = gasPrice % gwei == BigInt(0) ? BigInt(0) : BigInt(1)
        return (gasPrice / gwei + up) * gwei
    }

    private async _signAndSubmitEvmTx(
        wallet: Wallet,
        cAddress: string,
        unsignedTx: EvmTx,
        txType: string
    ): Promise<TransactionReceipt | null> {
        let unsignedTxHex = unsignedTx.unsignedSerialized

        if (this._core.beforeTxSignature) {
            let proceed = await this._core.beforeTxSignature({ txType, unsignedTxHex })
            if (!proceed) {
                return null
            }
        }

        let txId: string
        if (wallet.signAndSubmitCTransaction) {
            txId = await wallet.signAndSubmitCTransaction(unsignedTxHex)
            if (!ethers.isHexString(txId) || ethers.dataLength(txId) !== 32) {
                throw new Error(`The function 'signAndSubmitCTransaction' returned an invalid transaction id (${txId})`)
            }
        } else {
            let digest = unsignedTx.unsignedHash
            let signature = await Signature.signEvmTx(wallet, unsignedTxHex, digest, cAddress)

            let tx = EvmTx.from({ signature, ...unsignedTx.toJSON() })

            if (this._core.beforeTxSubmission) {
                let signedTxHex = tx.serialized
                let proceed = await this._core.beforeTxSubmission({ txType, signedTxHex, txId: tx.hash })
                if (!proceed) {
                    return null
                }
            }

            await this._core.ethers.broadcastTransaction(tx.serialized)
            txId = tx.hash
        }

        if (this._core.afterTxSubmission) {
            let proceed = await this._core.afterTxSubmission({ txType, txId })
            if (!proceed) {
                return null
            }
        }

        let receipt = await this._core.ethers.waitForTransaction(
            txId, null, this._core.const.txConfirmationTimeout)
        if (receipt) {
            let txStatus = receipt.status == 1 ? true : false
            if (this._core.afterTxConfirmation) {
                await this._core.afterTxConfirmation({ txType, txId, txStatus })
            }
            if (!txStatus) {
                throw new Error(`Transaction ${txType} with id ${txId} failed`)
            }
        } else {
            throw new Error(`Transaction ${txType} with id ${txId} not confirmed`)
        }
        return receipt
    }

    private async _signAndSubmitAvaxTx(
        wallet: Wallet,
        account: Account,
        unsignedTx: AvaxTx,
        txType: string
    ): Promise<void> {
        let unsignedTxHex = ethers.hexlify(unsignedTx.toBytes())

        if (this._core.beforeTxSignature) {
            let proceed = await this._core.beforeTxSignature({ txType, unsignedTxHex })
            if (!proceed) {
                return
            }
        }

        let digest = ethers.hexlify(messageHashFromUnsignedTx(unsignedTx))
        let signature = await Signature.signAvaxTx(wallet, unsignedTxHex, digest, account.publicKey)

        let compressedPublicKey = Account.getPublicKey(account.publicKey, true)
        let coordinates = unsignedTx.getSigIndicesForPubKey(ethers.getBytes(compressedPublicKey))
        if (coordinates) {
            let sig = ethers.Signature.from(signature)
            let sigBytes = ethers.getBytes(ethers.concat([sig.r, sig.s, `0x0${sig.yParity}`]))
            coordinates.forEach(([index, subIndex]) => {
                unsignedTx.addSignatureAt(sigBytes, index, subIndex)
            })
        }
        let tx = unsignedTx.getSignedTx().toBytes()

        if (this._core.beforeTxSubmission) {
            let signedTxHex = ethers.hexlify(tx)
            let txHash = ethers.sha256(signedTxHex)
            let txId = base58.encode(futils.addChecksum(ethers.getBytes(txHash)))
            let proceed = await this._core.beforeTxSubmission({ txType, signedTxHex, txId })
            if (!proceed) {
                return
            }
        }

        let txIssueResponse = await this._core.flarejs.evmApi.issueTx({ tx: ethers.hexlify(futils.addChecksum(tx)) })
        let txId = txIssueResponse.txID

        if (this._core.afterTxSubmission) {
            let proceed = await this._core.afterTxSubmission({ txType, txId })
            if (!proceed) {
                return
            }
        }

        let status = "Unknown"
        let start = Date.now()
        while (Date.now() - start < this._core.const.txConfirmationTimeout) {
            let statusResponse = await this._core.flarejs.evmApi.getAtomicTxStatus(txId)
            status = statusResponse.status
            await Utils.sleep(this._core.const.txConfirmationCheckout)            
            if (status === "Accepted" || status === "Rejected") {
                if (this._core.afterTxConfirmation) {
                    let txStatus = status === "Accepted" ? true : false
                    await this._core.afterTxConfirmation({ txType, txId, txStatus })
                }
                break
            }
        }
        if (status !== "Accepted") {
            throw new Error(`Transaction ${txType} with id ${txId} not confirmed (status is ${status})`)
        }
    }

}