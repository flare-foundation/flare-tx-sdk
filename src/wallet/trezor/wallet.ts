import { Wallet } from "../";
import { TrezorConnector } from "./connector";
import { ethers, Transaction } from "ethers";

export class TrezorWallet implements Wallet {

    constructor(connector: TrezorConnector, bip44Path: string) {
        this._connector = connector
        this._path = bip44Path
    }

    protected readonly _connector: TrezorConnector
    protected readonly _path: string
    protected _address: string
    protected _publicKey: string

    async getPublicKey(): Promise<string> {
        if (!this._publicKey) {
            let response = await this._connector.ethereumGetPublicKey(
                { path: this._path, showOnTrezor: false }
            )
            let payload = this._readResponse(response, "get public key")
            if (!payload.publicKey) {
                throw new Error("Failed to obtain public key from trezor")
            }
            this._publicKey = this._prefixedHex(payload.publicKey)
        }
        return this._publicKey
    }

    async getCAddress(): Promise<string> {
        if (!this._address) {
            let publicKey = await this.getPublicKey()
            this._address = ethers.computeAddress(publicKey)
        }
        return this._address
    }

    async signEthMessage(message: string): Promise<string> {
        let response = await this._connector.ethereumSignMessage(
            { path: this._path, message: message, hex: false }
        )
        let payload = this._readResponse(response, "sign message")
        if (!payload.signature) {
            throw new Error("Failed to obtain message signature from trezor")
        }
        return this._prefixedHex(payload.signature)
    }
    
    async signCTransaction(tx: string): Promise<string> {
        let txObj = Transaction.from(tx)
        let to = txObj.to
        let value = this._valueToHex(txObj.value)
        let data = txObj.data
        let nonce = this._valueToHex(txObj.nonce)
        let gasLimit = this._valueToHex(txObj.gasLimit)        
        let maxPriorityFeePerGas = this._valueToHex(txObj.maxPriorityFeePerGas)
        let maxFeePerGas = this._valueToHex(txObj.maxFeePerGas)
        let chainId = Number(txObj.chainId)
        let response = await this._connector.ethereumSignTransaction({
            path: this._path,
            transaction: { to, value, data, nonce, gasLimit, maxPriorityFeePerGas, maxFeePerGas, chainId }
        })
        let payload = this._readResponse(response, "sign transaction")
        try {
            let signature = ethers.Signature.from(payload)
            return signature.serialized
        } catch {
            throw new Error("Failed to obtain transaction signature from trezor")
        }
    }

    protected _readResponse(response: any, method: string): any {
        if (response.success && response.payload) {
            return response.payload
        }
        let error = `Failed to ${method} on trezor`
        if (response.payload) {
            let info = new Array<string>()
            if (response.payload.error) {
                info.push(`error: ${response.payload.error}`)
            }
            if (response.payload.code) {
                info.push(`code: ${response.payload.code}`)
            }
            if (info.length > 0) {
                error += ` (${info.join(", ")})`
            }
        }
        throw new Error(error)
    }

    protected _prefixedHex(hex: string): string {
        return hex.startsWith("0x") ? hex : `0x${hex}`
    }

    protected _valueToHex(value: number | bigint | null): string | null {
        if (value === null) {
            return null
        } else {
            return `0x${value.toString(16)}`
        }
    }

}