import { Wallet } from "../"
import { ethers } from "ethers";
import { EthApp, FlrApp } from "./signer";
import { LedgerCore } from "./core";

export abstract class LedgerWallet implements Wallet {

    constructor(transport: any, derivationPath: string) {
        this._core = new LedgerCore(transport)
        this._derivationPath = derivationPath
    }

    protected readonly _core: LedgerCore
    protected readonly _derivationPath: string
    protected _address: string
    protected _publicKey: string

    abstract getPublicKey(): Promise<string>

    async getCAddress(): Promise<string> {
        if (!this._address) {
            let publicKey = await this.getPublicKey()
            this._address = ethers.computeAddress(publicKey)
        }
        return this._address
    }

    protected async _signEthMessage(signer: FlrApp | EthApp, app: string, message: string): Promise<string> {
        await this._core.requireApp(app)
        let response = await signer.signPersonalMessage(this._derivationPath, this._hexUtf8(message))
        let payload = this._readResponse(response, "sign message")
        return this._extractSignature(payload)
    }

    protected _readResponse(response: any, method: string): any {
        let error = `Failed to ${method} on ledger`
        if (!response) {
            throw new Error(`${error} (empty response)`)
        }
        if (response.errorMessage && response.errorMessage != 'No errors') {
            let info = new Array<string>()
            info.push(`error: ${response.errorMessage}`)
            if (response.returnCode) {
                info.push(`code: ${response.returnCode}`)
            }
            throw Error(`${error} (${info.join(", ")})`)
        }
        return response
    }

    protected _extractSignature(payload: any): string {
        let error = "Failed to extract signature from ledger response"
        try {
            if (!payload.r || !payload.s || !payload.v) {
                throw new Error(`${error} (missing r, s, v parameters)`)
            }
            let rsv = {
                r: this._prefixedHex(payload.r),
                s: this._prefixedHex(payload.s),
                v: this._prefixedHex(payload.v)
            }
            let signature = ethers.Signature.from(rsv)
            return signature.serialized
        } catch (e) {
            throw new Error(`${error} (${e.message})`)
        }
    }

    protected _getTxResolution(tx: string): any {
        tx
        return {
            nfts: [],
            erc20Tokens: [],
            externalPlugin: [],
            plugin: [],
            domains: []
        }
    }

    protected _prefixedHex(value: string | number | Buffer): string {
        if (typeof(value) === "number") {
            value = value.toString(16)
        }
        if (Buffer.isBuffer(value)) {
            value = value.toString("hex")
        }
        return value.startsWith("0x") ? value : `0x${value}`
    }

    protected _hexUtf8(utf8String: string): string {
        return ethers.hexlify(ethers.toUtf8Bytes(utf8String)).slice(2)
    }
}

export class FlrLedgerWallet extends LedgerWallet {

    constructor(app: FlrApp, derivationPath: string) {
        super(app.transport, derivationPath)
        this._app = app
    }

    protected readonly _app: FlrApp

    async getPublicKey(): Promise<string> {
        if (this._publicKey) {
            return this._publicKey
        }
        await this._core.requireApp(LedgerCore.FLR)
        let response = await this._app.getAddressAndPubKey(this._derivationPath)
        let payload = this._readResponse(response, "get public key")
        if (!payload.compressed_pk) {
            throw new Error("Failed to get public key on ledger (no public key in response)")
        }
        return "0x" + response.compressed_pk.toString("hex")
    }

    async signEthMessage(message: string): Promise<string> {
        return this._signEthMessage(this._app, LedgerCore.FLR, message)
    }

    async signCTransaction(transaction: string): Promise<string> {
        await this._core.requireApp(LedgerCore.FLR)
        let response = await this._app.signEVMTransaction(this._derivationPath, transaction.slice(2), this._getTxResolution(transaction))
        let payload = this._readResponse(response, "sign C-chain transaction")
        return this._extractSignature(payload)
    }

    async signPTransaction(transaction: string): Promise<string> {
        await this._core.requireApp(LedgerCore.FLR)
        let response = await this._app.sign(this._derivationPath, Buffer.from(transaction.slice(2), "hex"))
        let payload = this._readResponse(response, "sign P-chain transaction")
        return this._extractSignature(payload)
    }

}

export class EthLedgerWallet extends LedgerWallet {

    constructor(app: EthApp, derivationPath: string) {
        super(app.transport, derivationPath)
        this._app = app
    }

    protected readonly _app: EthApp

    async getPublicKey(): Promise<string> {
        if (this._publicKey) {
            return this._publicKey
        }
        await this._core.requireApp(LedgerCore.ETH)
        let response = await this._app.getAddress(this._derivationPath);
        let payload = this._readResponse(response, "get public key")
        if (!payload.publicKey) {
            throw new Error("Failed to get public key on ledger (no public key in response)")
        }
        return this._prefixedHex(response.publicKey)
    }

    async signEthMessage(message: string): Promise<string> {
        return this._signEthMessage(this._app, LedgerCore.ETH, message)
    }

    async signCTransaction(transaction: string): Promise<string> {
        await this._core.requireApp(LedgerCore.ETH)
        let response = await this._app.signTransaction(this._derivationPath, transaction.slice(2), this._getTxResolution(transaction))
        let payload = this._readResponse(response, "sign transaction")
        return this._extractSignature(payload)
    }

}