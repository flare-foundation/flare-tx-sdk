import { ethers, Wallet as EthersWallet, JsonRpcProvider, Transaction } from "ethers"
import { Constants, Network } from "../../src/network";
import { Wallet } from "../../src/wallet";
import { UnsignedTx as UnsignedCTx } from "@flarenetwork/flarejs/dist/apis/evm";
import { UnsignedTx as UnsignedPTx } from "@flarenetwork/flarejs/dist/apis/platformvm";

export abstract class TestWallet implements Wallet {

    constructor(privateKey: string) {
        this.ethersWallet = new EthersWallet(privateKey);
    }

    protected ethersWallet: EthersWallet

    abstract getDescription(): string

    async getPublicKey(): Promise<string> {
        return this.ethersWallet.signingKey.publicKey
    }

}

export class TestDigestWallet extends TestWallet {

    getDescription(): string {
        return "a wallet that implements the function `signDigest`"
    }

    async signDigest(digest: string): Promise<string> {
        return this.ethersWallet.signingKey.sign(digest).serialized
    }
}

export class TestEthMessageWallet extends TestWallet {

    getDescription(): string {
        return "a wallet that implements the function `signEthMessage`"
    }

    async signEthMessage(message: string): Promise<string> {
        return this.ethersWallet.signMessage(message)
    }
}

export class TestEvmTransactionWallet extends TestWallet {

    getDescription(): string {
        return "a wallet that implements the function `signCTransaction`"
    }

    async signCTransaction(tx: string): Promise<string> {
        let digest = ethers.keccak256(tx)
        return this.ethersWallet.signingKey.sign(digest).serialized
    }
}

export class TestEvmSubmitTransactionWallet extends TestWallet {

    getDescription(): string {
        return "a wallet that implements the function `signAndSubmitCTransaction`"
    }

    async getCAddress(): Promise<string> {
        return this.ethersWallet.address
    }

    async signAndSubmitCTransaction(tx: string): Promise<string> {
        let txObj = Transaction.from(tx)
        let provider = this._getProvider(txObj.chainId)
        let digest = ethers.keccak256(tx)
        let signature = this.ethersWallet.signingKey.sign(digest).serialized
        let signedTxObj = Transaction.from({ signature, ...txObj.toJSON() })
        let txResponse = await provider.broadcastTransaction(signedTxObj.serialized)
        return txResponse.hash
    }

    private _getProvider(chainId: bigint) {
        if (chainId === BigInt(14)) {
            return new JsonRpcProvider(Constants.FLARE.rpc)
        } else if (chainId === BigInt(19)) {
            return new JsonRpcProvider(Constants.SONGBIRD.rpc)
        } else if (chainId === BigInt(114)) {
            return new JsonRpcProvider(Constants.COSTON2.rpc)
        } else if (chainId === BigInt(16)) {
            return new JsonRpcProvider(Constants.COSTON.rpc)
        } else {
            throw new Error("Unkown chain id")
        }
    }
}

export class TestAvaxTransactionWallet extends TestWallet {

    getDescription(): string {
        return "a wallet that implements the function `signPTransaction`"
    }

    async signPTransaction(tx: string): Promise<string> {
        tx = tx.startsWith("0x") ? tx.slice(2) : tx
        let digest: string
        let unsignedTx = this._getCTx(tx) ?? this._getPTx(tx)
        if (unsignedTx == null) {
            throw new Error("Failed to parse AVAX transaction")
        }
        digest = ethers.sha256(`0x${tx}`)
        return this.ethersWallet.signingKey.sign(digest).serialized
    }

    _getCTx(tx: string): UnsignedCTx | null {
        try {
            let ctx = new UnsignedCTx()
            ctx.fromBuffer(Buffer.from(tx, "hex") as any)
            return ctx
        } catch {
            return null
        }
    }

    _getPTx(tx: string): UnsignedPTx | null {
        try {
            let ptx = new UnsignedPTx()
            ptx.fromBuffer(Buffer.from(tx, "hex") as any)
            return ptx
        } catch {
            return null
        }
    }
}