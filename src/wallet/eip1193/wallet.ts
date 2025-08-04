import { Wallet } from "../";
import { ethers, JsonRpcProvider, SigningKey, Transaction } from "ethers";
import { EIP1193Based, EIP1193Core } from "./core";
import { Chain } from "./chain";

/**
 * The class that implements {@link Wallet} and represents an EIP-1193 account.
 */
export class EIP1193Wallet extends EIP1193Based implements Wallet {

    constructor(core: EIP1193Core, address: string) {
        super(core)
        this._address = address;
    }

    protected _address: string
    protected _publicKey: string

    /**
     * Returns the C-chain address of the wallet.
     * @returns The C-chain address in the hexadecimal encoding.
     */
    async getCAddress(): Promise<string> {
        return this._address
    }

    /**
     * Returns the public key of the wallet.
     * @returns The public key in the hexadecimal encoding.
     * @remark When called for the first time, the function requests a message signature,
     * from which the public key is recovered.
     */
    async getPublicKey(): Promise<string> {
        if (!this._publicKey) {
            this._publicKey = await this._recoverPublicKeyFromTx()
        }
        if (!this._publicKey) {
            this._publicKey = await this._recoverPublicKeyFromMsg()
        }
        return this._publicKey
    }

    /**
     * Signs a message with ETH prefix.
     * @param message UTF8 encoded message.
     * @returns The signature in hexadecimal encoding.
     */
    async signEthMessage(message: string): Promise<string> {
        let request = {
            method: "personal_sign",
            params: [this._hexUtf8(message), this._address]
        }
        let signature = await this._core.requestSignature(request, this._address)
        return String(signature)
    }

    /**
     * Signs and submits a C-chain (Ethereum Virtual Machine) transaction.
     * @param tx Unsigned C-chain (EVM) transaction in hexadecimal encoding.
     * @returns The transaction id in hexadecimal encoding.
     */
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

    protected async _recoverPublicKeyFromTx(): Promise<string> {
        for (let chainId of Chain.getChainIds()) {
            let chainNumber = BigInt(parseInt(chainId, 16))
            let chainData = Chain.getChainData(chainNumber)
            if (chainData.blockExplorerUrls.length == 0) {
                continue
            }
            if (chainData.rpcUrls.length == 0) {
                continue
            }

            let explorerUrl = chainData.blockExplorerUrls[0]
            let response: any
            try {
                let data = await fetch(`${explorerUrl}api?module=account&action=txlist&address=${this._address}`)
                response = await data.json()
            } catch {
                continue
            }
            if (response.status !== "1") {
                continue
            }
            let txsResponse = response.result as Array<any>
            let txs = txsResponse
                .filter((tx: { from: string }) => ethers.getAddress(tx.from) === ethers.getAddress(this._address))
                .map((tx: { hash: any }) => tx.hash)
            if (txs.length == 0) {
                continue
            }

            let provider = new JsonRpcProvider(chainData.rpcUrls[0])
            let txResponse = await provider.getTransaction(txs[0])
            let tx = Transaction.from(txResponse)
            let publicKey = tx.fromPublicKey
            if (ethers.computeAddress(publicKey) !== ethers.getAddress(this._address)) {
                continue
            }
            return publicKey
        }
        return null
    }

    protected async _recoverPublicKeyFromMsg(): Promise<string> {
        let msg = "Please sign this message in order to obtain the public key associated with your account.";
        let signature = await this.signEthMessage(msg)
        let ethMsg = `\x19Ethereum Signed Message:\n${msg.length}${msg}`
        let digest = ethers.id(ethMsg)
        let publicKey = SigningKey.recoverPublicKey(digest, signature)
        if (ethers.computeAddress(publicKey) !== ethers.getAddress(this._address)) {
            return null
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