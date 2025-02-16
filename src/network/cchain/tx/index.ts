import { Export } from "./export";
import { Import } from "./import";
import { NetworkCore, NetworkBased } from "../../core";
import { Account } from "../../account";
import { Signature } from "../../sign";
import { Utils } from "../../utils";
import { TxType } from "../../txtype";
import { Wallet } from "../../../wallet";
import { ethers, Transaction as EvmTx, Transaction } from "ethers";
import { BN } from "@flarenetwork/flarejs";
import { EcdsaSignature } from "@flarenetwork/flarejs/dist/common";
import { PublicKeyPrefix, Serialization } from "@flarenetwork/flarejs/dist/utils";
import { UnsignedTx as AvaxTx } from "@flarenetwork/flarejs/dist/apis/evm";
import { Transfer } from "./transfer";
import { ContractRegistry } from "../contract/registry";
import { GenericContract } from "../contract/generic";
import { Constants } from "../../constants";

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
        wallet: Wallet, cAddress: string, recipient: string, amount: bigint
    ): Promise<void> {
        let unsignedTx = await this._transfer.getTx(cAddress, recipient, amount)
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
    ): Promise<void> {
        let unsignedTxHex = unsignedTx.unsignedSerialized

        if (this._core.beforeTxSignature) {
            let proceed = await this._core.beforeTxSignature({ txType, unsignedTxHex })
            if (!proceed) {
                return
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

            let tx = Transaction.from({ signature, ...unsignedTx.toJSON() })

            if (this._core.beforeTxSubmission) {
                let signedTxHex = tx.serialized
                let proceed = await this._core.beforeTxSubmission({ txType, signedTxHex, txId: tx.hash })
                if (!proceed) {
                    return
                }
            }

            await this._core.ethers.broadcastTransaction(tx.serialized)
            txId = tx.hash
        }

        if (this._core.afterTxSubmission) {
            let proceed = await this._core.afterTxSubmission({ txType, txId })
            if (!proceed) {
                return
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
    }

    private async _signAndSubmitAvaxTx(
        wallet: Wallet,
        account: Account,
        unsignedTx: AvaxTx,
        txType: string
    ): Promise<void> {
        let unsignedTxHex = Utils.addHexPrefix(unsignedTx.toBuffer().toString("hex"))

        if (this._core.beforeTxSignature) {
            let proceed = await this._core.beforeTxSignature({ txType, unsignedTxHex })
            if (!proceed) {
                return
            }
        }

        let unsignedHashes = unsignedTx.prepareUnsignedHashes(undefined as any)
        let digest = Utils.addHexPrefix(unsignedHashes[0].message)
        let signature = await Signature.signAvaxTx(wallet, unsignedTxHex, digest, account.publicKey)

        let signatures = Array(unsignedHashes.length).fill(this._getEcdsaSignature(signature))
        let prefixedPublicKey = `${PublicKeyPrefix}${Utils.removeHexPrefix(account.publicKey)}`
        let kc = this._core.avalanche.CChain().keyChain()
        kc.importKey(prefixedPublicKey)
        let tx = unsignedTx.signWithRawSignatures(signatures, kc)

        if (this._core.beforeTxSubmission) {
            let signedTxHex = `0x${tx.toBuffer().toString("hex")}`
            let txHash = ethers.sha256(signedTxHex).slice(2)
            let txId = Serialization.getInstance().bufferToType(Buffer.from(txHash, "hex") as any, "cb58")
            let proceed = await this._core.beforeTxSubmission({ txType, signedTxHex, txId })
            if (!proceed) {
                return
            }
        }

        let txId = await this._core.avalanche.CChain().issueTx(tx)

        if (this._core.afterTxSubmission) {
            let proceed = await this._core.afterTxSubmission({ txType, txId })
            if (!proceed) {
                return
            }
        }

        let status = "Unknown"
        let start = Date.now()
        while (Date.now() - start < this._core.const.txConfirmationTimeout) {
            status = await this._core.avalanche.CChain().getAtomicTxStatus(txId)
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

    private _getEcdsaSignature(signature: string): EcdsaSignature {
        let sig = ethers.Signature.from(signature)
        let r = new BN(Utils.removeHexPrefix(sig.r), "hex")
        let s = new BN(Utils.removeHexPrefix(sig.s), "hex")
        let recoveryParam = sig.yParity
        return { r, s, recoveryParam }
    }

}