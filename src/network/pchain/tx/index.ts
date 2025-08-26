import { Wallet } from "../../../wallet"
import { Account } from "../../account"
import { NetworkCore, NetworkBased } from "../../core"
import { TxType } from "../../txtype"
import { Export } from "./export"
import { Import } from "./import"
import { Utils } from "../../utils"
import { Signature } from "../../sign"
import { ethers } from "ethers"
import { messageHashFromUnsignedTx, pvmSerial, TypeSymbols, UnsignedTx, utils as futils } from "@flarenetwork/flarejs"
import { Delegation as Delegator } from "./delegator"
import { base58 } from "@scure/base"
import { Transfer } from "./transfer"
import { Validator } from "./validator"

export class Transactions extends NetworkBased {

    constructor(network: NetworkCore) {
        super(network)
        this._transfer = new Transfer(network)
        this._export = new Export(network)
        this._import = new Import(network)
        this._delegator = new Delegator(network)
        this._validator = new Validator(network)
    }

    private _transfer: Transfer
    private _export: Export
    private _import: Import
    private _delegator: Delegator
    private _validator: Validator

    async transfer(
        wallet: Wallet, account: Account, recipient: string, amount?: bigint
    ): Promise<void> {
        let unsignedTx: UnsignedTx
        if (amount) {
            unsignedTx = await this._transfer.getTx(account.pAddress, recipient, amount)
        } else {
            let response = await this._core.flarejs.pvmApi.getBalance({ addresses: [`P-${account.pAddress}`] })
            let balance = response.balance * BigInt(1e9)
            let fee = await this._core.flarejs.getBaseTxFee()
            unsignedTx = await this._transfer.getTx(account.pAddress, recipient, balance - fee)
        }
        await this._signAndSubmitAvaxTx(wallet, account, unsignedTx, TxType.TRANSFER_PASSET)
    }

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
        let unsignedTx = await this._delegator.getTx(account.pAddress, amount, nodeId, startTime, endTime)
        await this._signAndSubmitAvaxTx(wallet, account, unsignedTx, TxType.ADD_DELEGATOR_P)
    }

    async addValidatorOnP(
        wallet: Wallet,
        account: Account,
        amount: bigint,
        nodeId: string,
        startTime: bigint,
        endTime: bigint,
        delegationFee: bigint,
        popBLSPublicKey: string,
        popBLSSignature: string
    ): Promise<void> {
        let unsignedTx = await this._validator.getTx(
            account.pAddress, amount, nodeId, startTime, endTime, delegationFee, popBLSPublicKey, popBLSSignature)
        await this._signAndSubmitAvaxTx(wallet, account, unsignedTx, TxType.ADD_VALIDATOR_P)
    }

    async getBaseTxFee(): Promise<bigint> {
        return this._core.flarejs.getBaseTxFee()
    }

    async getStakeTx(
        txId: string
    ): Promise<pvmSerial.AddDelegatorTx | pvmSerial.AddValidatorTx | pvmSerial.AddPermissionlessDelegatorTx | pvmSerial.AddPermissionlessValidatorTx> {
        let tx = await this._core.flarejs.pvmApi.getTx({ txID: txId })
        let utx = tx.unsignedTx
        let stx: pvmSerial.AddDelegatorTx | pvmSerial.AddValidatorTx | pvmSerial.AddPermissionlessDelegatorTx | pvmSerial.AddPermissionlessValidatorTx
        if (utx._type === TypeSymbols.AddDelegatorTx) {
            stx = utx as pvmSerial.AddDelegatorTx
        } else if (utx._type === TypeSymbols.AddValidatorTx) {
            stx = utx as pvmSerial.AddValidatorTx
        } else if (utx._type === TypeSymbols.AddPermissionlessDelegatorTx) {
            stx = utx as pvmSerial.AddPermissionlessDelegatorTx
        } else if (utx._type === TypeSymbols.AddPermissionlessValidatorTx) {
            stx = utx as pvmSerial.AddPermissionlessValidatorTx
        } else {
            throw new Error(`Transaction ${txId} is of type ${utx._type} (not a stake transaction)`)
        }
        return stx
    }

    private async _signAndSubmitAvaxTx(
        wallet: Wallet,
        account: Account,
        unsignedTx: UnsignedTx,
        txType: string
    ): Promise<void> {
        let unsignedTxHex = ethers.hexlify(unsignedTx.toBytes())

        if (this._core.beforeTxSignature) {
            let proceed = await this._core.beforeTxSignature({ txType, unsignedTxHex })
            if (!proceed) {
                return null
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

        let txIssueResponse = await this._core.flarejs.pvmApi.issueTx({ tx: ethers.hexlify(futils.addChecksum(tx)) })
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
            let statusResponse = await this._core.flarejs.pvmApi.getTxStatus({ txID: txId })
            status = statusResponse.status
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

}