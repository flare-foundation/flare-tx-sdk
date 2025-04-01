import { describe, it } from "node:test";
import assert from "assert";
import { TestEnvironment } from "./env";
import { Amount } from "../src";

export function runGenericContractTests(env: TestEnvironment): void {
    describe("Generic contract tests", function () {
        let network = env.network
        let wallets = env.getEvmWallets()

        let testAmount = Amount.nats(1)
        let abi = `[ { "inputs": [ { "internalType": "address", "name": "account", "type": "address" } ], "name": "balanceOf", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "_to", "type": "address" }, { "internalType": "uint256", "name": "_bips", "type": "uint256" } ], "name": "delegate", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "deposit", "outputs": [], "stateMutability": "payable", "type": "function" }]`

        for (let wallet of wallets) {
            describe(wallet.getDescription(), function () {

                it("contract call", async function () {
                    let publicKey = await wallet.getPublicKey()
                    let address = network.getCAddress(publicKey)
                    await network.wrapNative(wallet, testAmount)
                    let balance1 = await network.getBalanceWrappedOnC(publicKey)
                    let balance2 = await network.invokeContractCallOnC("WNat", abi, "balanceOf", address)
                    await network.unwrapToNative(wallet, testAmount)
                    assert.strictEqual(balance1, balance2, "unmatching wrapped balance")
                })

                it("payable contract method", async function () {
                    let publicKey = await wallet.getPublicKey()
                    let startBalance = await network.getBalanceWrappedOnC(publicKey)
                    await network.invokeContractMethodOnC(wallet, "WNat", abi, "deposit", testAmount)
                    let currentBalance = await network.getBalanceWrappedOnC(publicKey)
                    assert.strictEqual(currentBalance, startBalance + testAmount, "unmatching wrapped balance")
                    await network.unwrapToNative(wallet, testAmount)
                })

                it("unpayable contract method", async function () {
                    let publicKey = await wallet.getPublicKey()
                    await network.undelegateFromFtso(wallet)
                    let bips = Amount.percentages(50)
                    await network.invokeContractMethodOnC(wallet, "WNat", abi, "delegate", BigInt(0), env.address1, bips)
                    let delegates = await network.getFtsoDelegatesOf(publicKey)
                    assert.strictEqual(delegates.length, 1, "invalid number of delegates")
                    assert.strictEqual(delegates[0].address, env.address1, "invalid delegate")
                    assert.strictEqual(delegates[0].shareBP, bips, "invalid share")
                    await network.undelegateFromFtso(wallet)
                })
            })
        }
    })
}