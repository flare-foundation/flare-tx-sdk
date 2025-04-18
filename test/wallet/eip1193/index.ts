import { describe, it } from "node:test";
import assert from "assert"
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { EIP1193WalletController, EIP1193Wallet } from "../../../src"
import { TestProvider } from "./provider"
import { Transaction } from "ethers";

async function execute() {

    let accounts: any
    const TEST_ACCOUNTS_FILE = path.join("test", "keys", "eip1193_accounts.json")
    if (existsSync(TEST_ACCOUNTS_FILE)) {
        accounts = JSON.parse(readFileSync(TEST_ACCOUNTS_FILE).toString())
    } else {
        console.info(`To execute tests provide json file ${TEST_ACCOUNTS_FILE} with a list of accounts, each containing 'private_key' and 'address' field.`)
        return
    }

    let provider = new TestProvider(accounts.map((a: { private_key: string }) => a.private_key))
    let controller = new EIP1193WalletController(provider)

    describe("controller", () => {

        it("active wallet", async () => {
            let wallet = await controller.getActiveWallet()
            assert.strictEqual(await wallet.getCAddress(), accounts[0].address)
        })

        it("wallets", async () => {
            let wallets = await controller.getWallets()
            for (let i = 0; i < wallets.length; i++) {
                assert.strictEqual(await wallets[i].getCAddress(), accounts[i].address)
            }
        })

        it("wallet change", async() => {
            let activeWallet = await controller.getActiveWallet()
            assert.strictEqual(await activeWallet.getCAddress(), accounts[0].address)
            
            controller.onWalletChange((wallet: EIP1193Wallet) => {
                activeWallet = wallet
            })

            let index = 1
            provider.changeAccount(index)
            assert.strictEqual(await activeWallet.getCAddress(), accounts[index].address)            
        })
        
    })

    describe("wallet", () => {

        it ("public key", async () => {
            let wallet = await controller.getActiveWallet()
            await wallet.getPublicKey()
        })

        it ("personal message", async () => {
            let wallet = await controller.getActiveWallet()
            await wallet.signEthMessage("test")
        })

        it ("coston transaction", async () => {
            let wallets = await controller.getWallets()
            provider.changeAccount(Math.floor(wallets.length * Math.random()))
            provider.changeAccount(Math.floor(wallets.length * Math.random()))
            wallets = await controller.getWallets()
            let wallet = wallets[0]
            let recipient = await wallets[1].getCAddress()
            let tx = Transaction.from({
                to: recipient,
                value: BigInt(1e15),
                chainId: 16,
                gasLimit: 21000,
                maxFeePerGas: BigInt(50 * 1e9),
                maxPriorityFeePerGas: BigInt(0)
            })
            await wallet.signAndSubmitCTransaction(tx.unsignedSerialized)
        })

        it ("coston2 transaction", async () => {
            let wallets = await controller.getWallets()
            provider.changeAccount(Math.floor(wallets.length * Math.random()))
            provider.changeAccount(Math.floor(wallets.length * Math.random()))
            wallets = await controller.getWallets()
            let wallet = wallets[0]
            let recipient = await wallets[1].getCAddress()
            let tx = Transaction.from({
                to: recipient,
                value: BigInt(1e15),
                chainId: 114,
                gasLimit: 21000,
                maxFeePerGas: BigInt(50 * 1e9),
                maxPriorityFeePerGas: BigInt(0)
            })
            await wallet.signAndSubmitCTransaction(tx.unsignedSerialized)
        })

    })
}

execute()