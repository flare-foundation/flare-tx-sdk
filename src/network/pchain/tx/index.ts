import { GetTxStatusResponse, UnsignedTx, Tx, AddDelegatorTx, AddValidatorTx } from "@flarenetwork/flarejs/dist/apis/platformvm"
import { Wallet } from "../../../wallet"
import { Account } from "../../account"
import { NetworkCore, NetworkBased } from "../../core"
import { TxType } from "../../txtype"
import { Export } from "./export"
import { Import } from "./import"
import { Utils } from "../../utils"
import { Signature } from "../../sign"
import { PublicKeyPrefix, Serialization } from "@flarenetwork/flarejs/dist/utils"
import { EcdsaSignature } from "@flarenetwork/flarejs/dist/common"
import { ethers } from "ethers"
import { BN } from "@flarenetwork/flarejs"
import { Delegation } from "./delegation"

export class Transactions extends NetworkBased {

    constructor(network: NetworkCore) {
        super(network)
        this._export = new Export(network)
        this._import = new Import(network)
        this._delegation = new Delegation(network)
    }

    private _export: Export
    private _import: Import
    private _delegation: Delegation

    async exportFromP(wallet: Wallet, account: Account, amount: bigint): Promise<void> {
        let unsignedTx = await this._export.getTx(account.pAddress, amount)
        await this._signAndSubmitAvaxTx(wallet, account, unsignedTx, TxType.EXPORT_P)
    }

    async importToP(wallet: Wallet, account: Account): Promise<void> {
        let unsignedTx = await this._import.getTx(account.pAddress)
        await this._signAndSubmitAvaxTx(wallet, account, unsignedTx, TxType.IMPORT_P)
    }

    async delegateOnP(
        wallet: Wallet,
        account: Account,
        amount: bigint,
        nodeId: string,
        startTime: bigint,
        endTime: bigint
    ): Promise<void> {
        let unsignedTx = await this._delegation.getTx(account.pAddress, amount, nodeId, startTime, endTime)
        await this._signAndSubmitAvaxTx(wallet, account, unsignedTx, TxType.ADD_DELEGATOR_P)
    }

    getDefaultTxFee(): bigint {
        return Utils.toBigint(this._core.avalanche.PChain().getDefaultTxFee()) * BigInt(1e9)
    }

    async getStakeTx(txId: string): Promise<AddDelegatorTx | AddValidatorTx> {
        let txHex = await this._core.avalanche.PChain().getTx(txId, "hex") as string
        let tx = new Tx()
        tx.fromBuffer(Buffer.from(Utils.removeHexPrefix(txHex), "hex") as any)
        let btx = tx.getUnsignedTx().getTransaction()
        let stx: AddDelegatorTx | AddValidatorTx
        if (btx.getTypeName() === "AddDelegatorTx") {
            stx = btx as AddDelegatorTx
        } else if (btx.getTypeName() === "AddValidatorTx") {
            stx = btx as AddValidatorTx
        } else {
            throw new Error("Not a stake transaction")
        }
        return stx
    }

    private async _signAndSubmitAvaxTx(
        wallet: Wallet,
        account: Account,
        unsignedTx: UnsignedTx,
        txType: string
    ): Promise<void> {
        let unsignedTxHex = Utils.addHexPrefix(unsignedTx.toBuffer().toString("hex"))

        if (this._core.beforeTxSignature) {
            let proceed = await this._core.beforeTxSignature({ txType, unsignedTxHex })
            if (!proceed) {
                return null
            }
        }

        let unsignedHashes = unsignedTx.prepareUnsignedHashes(undefined as any)
        let digest = Utils.addHexPrefix(unsignedHashes[0].message)
        let signature = await Signature.signAvaxTx(wallet, unsignedTxHex, digest, account.publicKey)

        let signatures = Array(unsignedHashes.length).fill(this._getEcdsaSignature(signature))
        let prefixedPublicKey = `${PublicKeyPrefix}${Utils.removeHexPrefix(account.publicKey)}`
        let kc = this._core.avalanche.PChain().keyChain()
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

        let txId = await this._core.avalanche.PChain().issueTx(tx)

        if (this._core.afterTxSubmission) {
            let proceed = await this._core.afterTxSubmission({ txType, txId })
            if (!proceed) {
                return
            }
        }

        let status = "Unknown"
        let start = Date.now()
        while (Date.now() - start < this._core.const.txConfirmationTimeout) {
            status = (await this._core.avalanche.PChain().getTxStatus(txId) as GetTxStatusResponse).status
            await Utils.sleep(this._core.const.txConfirmationCheckout)
            if (status === "Committed" || status === "Rejected") {
                if (this._core.afterTxConfirmation) {
                    let txStatus = status === "Committed" ? true : false
                    await this._core.afterTxConfirmation({ txType, txId, txStatus })
                }
                break
            }
        }
        if (status !== "Committed") {
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