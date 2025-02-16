import { ethers, SigningKey } from "ethers";
import { Wallet } from "../wallet";
import { Utils } from "./utils";

export class Signature {

    static async signEvmTx(
        wallet: Wallet,
        tx: string,
        digest: string,
        cAddressToRecover: string
    ): Promise<string> {
        let signature: string
        let recoveredCAddress: string
        if (wallet.signCTransaction) {
            signature = await wallet.signCTransaction(tx)
        } else if (wallet.signDigest) {
            signature = await wallet.signDigest(digest)
        } else {
            throw new Error("The wallet implements no suitable method to sign a C-chain transaction")
        }
        recoveredCAddress = this._recoverCAddress(digest, signature)
        if (recoveredCAddress != cAddressToRecover) {
            throw new Error("The C-chain address cannot be recovered from the signature")
        }
        return signature
    }

    static async signAvaxTx(
        wallet: Wallet,
        tx: string,
        digest: string,
        publicKeyToRecover: string
    ): Promise<string> {
        let signature: string
        let recoveredPublicKey: string
        if (wallet.signPTransaction) {
            signature = await wallet.signPTransaction(tx)
            recoveredPublicKey = this._recoverPublicKey(digest, signature)
        } else if (wallet.signDigest) {
            signature = await wallet.signDigest(digest)
            recoveredPublicKey = this._recoverPublicKey(digest, signature)
        } else if (wallet.signEthMessage) {
            let utf8String = Utils.removeHexPrefix(digest)
            signature = await wallet.signEthMessage(utf8String)
            recoveredPublicKey = this._recoverPublicKeyFromEthMessage(utf8String, signature)
        } else {
            throw new Error("The wallet implements no suitable method to sign a P-chain transaction")
        }
        if (recoveredPublicKey != publicKeyToRecover) {
            throw new Error("The public key cannot be recovered from the signature")
        }
        return signature
    }

    private static _recoverPublicKey(digest: string, signature: string): string {
        return SigningKey.recoverPublicKey(digest, signature)
    }

    private static _recoverPublicKeyFromEthMessage(utf8String: string, signature: string): string {
        let digest = ethers.id(`\x19Ethereum Signed Message:\n${utf8String.length}${utf8String}`)
        return this._recoverPublicKey(digest, signature)
    }

    private static _recoverCAddress(digest: string, signature: string): string {
        return ethers.recoverAddress(digest, signature)
    }

}