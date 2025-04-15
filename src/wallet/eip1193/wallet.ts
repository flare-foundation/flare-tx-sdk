import { Wallet } from "../";
import { ethers, SigningKey, Transaction } from "ethers";
import { EIP1193Based, EIP1193Core } from "./core";

export class EIP1193Wallet extends EIP1193Based implements Wallet {

    constructor(core: EIP1193Core, address: string) {
        super(core)
        this._address = address;
    }

    protected _address: string
    protected _publicKey: string

    async getCAddress(): Promise<string> {
        return this._address
    }

    async getPublicKey(): Promise<string> {
        if (!this._publicKey) {
            let msg = "Please sign this message in order to obtain the public key associated with your account.";
            let signature = await this.signEthMessage(msg);
            this._publicKey = this._recoverPublicKey(msg, signature, this._address);
        }
        return this._publicKey;
    }

    async signEthMessage(message: string): Promise<string> {
        let request = {
            method: "personal_sign",
            params: [this._hexUtf8(message), this._address]
        }
        let signature = await this._core.requestSignature(request, this._address)
        return String(signature)
    }

    async signAndSubmitCTransaction(tx: string): Promise<string> {
        let txObj = Transaction.from(tx)
        let to = txObj.to
        let from = this._address
        let gas = this._valueToHex(txObj.gasLimit)
        let value = this._valueToHex(txObj.value)
        let data = txObj.data
        let maxPriorityFeePerGas = this._valueToHex(txObj.maxPriorityFeePerGas)
        let maxFeePerGas = this._valueToHex(txObj.maxFeePerGas)
        let transaction = { to, from, gas, value, data, maxPriorityFeePerGas, maxFeePerGas }
        let sendTransactionRequest = {
            method: "eth_sendTransaction",
            params: [transaction]
        }
        await this._core.switchChain(txObj.chainId)
        let txId = await this._core.requestSignature(sendTransactionRequest, from)
        return String(txId);
    }

    protected _recoverPublicKey(msg: string, signature: string, address: string): string {
        let ethMsg = `\x19Ethereum Signed Message:\n${msg.length}${msg}`
        let digest = ethers.id(ethMsg)
        let publicKey = SigningKey.recoverPublicKey(digest, signature)
        if (ethers.computeAddress(publicKey) !== ethers.getAddress(address)) {
            throw new Error(`Failed to recover public key for address ${address}`)
        }
        return publicKey
    }

    protected _hexUtf8(utf8String: string): string {
        return ethers.hexlify(ethers.toUtf8Bytes(utf8String))
    }

    protected _valueToHex(value: number | bigint | null): string {
        if (value === null) {
            return null
        } else {
            return `0x${value.toString(16)}`
        }
    }

}