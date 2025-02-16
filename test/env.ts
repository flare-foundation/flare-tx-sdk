import { Network } from "../src"
import { TestAvaxTransactionWallet, TestDigestWallet, TestEthMessageWallet, TestEvmSubmitTransactionWallet, TestEvmTransactionWallet, TestWallet } from "./wallet"

export class TestEnvironment {

    constructor(network: Network, privateKey: string, address1: string, address2: string) {
        this.network = network
        this._privateKey = privateKey
        this.address1 = address1
        this.address2 = address2
    }

    private _privateKey: string

    network: Network
    address1: string
    address2: string

    getDigestWallet(): TestDigestWallet {
        return new TestDigestWallet(this._privateKey)
    }

    getEvmWallets(): Array<TestWallet> {
        let wallets = new Array<TestWallet>()
        wallets.push(new TestDigestWallet(this._privateKey))
        wallets.push(new TestEvmTransactionWallet(this._privateKey))
        wallets.push(new TestEvmSubmitTransactionWallet(this._privateKey))
        return wallets
    }

    getAvaxWallets(): Array<TestWallet> {
        let wallets = new Array<TestWallet>()
        wallets.push(new TestDigestWallet(this._privateKey))
        wallets.push(new TestEthMessageWallet(this._privateKey))
        wallets.push(new TestAvaxTransactionWallet(this._privateKey))
        return wallets
    }

}