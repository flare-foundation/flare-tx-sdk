import { Network } from "../../src"
import { TestAvaxTransactionWallet, TestDigestWallet, TestEthMessageWallet, TestEvmSubmitTransactionWallet, TestEvmTransactionWallet, TestWallet } from "./wallet"

export class TestEnvironment {

    constructor(
        network: Network,
        privateKey: string,
        cAddress1: string,
        pAddress1: string,
        cAddress2: string
    ) {
        this.network = network
        this._privateKey = privateKey
        this.cAddress1 = cAddress1
        this.pAddress1 = pAddress1
        this.cAddress2 = cAddress2
    }

    private _privateKey: string

    network: Network
    cAddress1: string
    pAddress1: string
    cAddress2: string

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