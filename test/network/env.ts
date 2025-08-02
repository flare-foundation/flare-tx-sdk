import { Network } from "../../src"
import { TestAvaxTransactionWallet, TestDigestWallet, TestEthMessageWallet, TestEvmSubmitTransactionWallet, TestEvmTransactionWallet, TestWallet } from "./wallet"
import { SigningKey } from "ethers"

export class TestEnvironment {

    constructor(
        network: Network,
        privateKeys: Array<string>
    ) {
        this.network = network
        this._privateKeys = privateKeys
    }

    private _privateKeys: Array<string>

    network: Network

    getDigestWallet(keyIndex?: number): TestDigestWallet {
        return new TestDigestWallet(this._privateKeys[keyIndex ?? 0])
    }

    getEvmWallets(keyIndex?: number): Array<TestWallet> {
        let wallets = new Array<TestWallet>()
        wallets.push(new TestDigestWallet(this._key(keyIndex)))
        wallets.push(new TestEvmTransactionWallet(this._key(keyIndex)))
        wallets.push(new TestEvmSubmitTransactionWallet(this._key(keyIndex)))
        return wallets
    }

    getAvaxWallets(keyIndex?: number): Array<TestWallet> {
        let wallets = new Array<TestWallet>()
        wallets.push(new TestDigestWallet(this._key(keyIndex)))
        wallets.push(new TestEthMessageWallet(this._key(keyIndex)))
        wallets.push(new TestAvaxTransactionWallet(this._key(keyIndex)))
        return wallets
    }

    getPublicKey(keyIndex?: number): string {
        return SigningKey.computePublicKey(this._key(keyIndex))
    }

    getCAddress(keyIndex?: number): string {
        return this.network.getCAddress(this._key(keyIndex))
    }

    getPAddress(keyIndex?: number): string {
        return this.network.getPAddress(this._key(keyIndex))
    }

    async waitForNextBlockOnC(): Promise<void> {
        let block = await this.network.getCurrentBlockOnC()
        let nextBlock = block
        while (nextBlock <= block) {
            await this.sleep(500)
            nextBlock = await this.network.getCurrentBlockOnC()
        }
    }

    async sleep(ms: number): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    private _key(keyIndex?: number): string {
        return this._privateKeys[keyIndex ?? 0]
    }

}