import { describe, it } from "node:test";
import assert from "assert";
import { TestEnvironment } from "./env";
import { Amount } from "../src";

export function runWNatTests(env: TestEnvironment): void {
    describe("WNat tests", function () {
        let network = env.network
        let wallets = env.getEvmWallets()

        let testAmount = Amount.nats(1)

        for (let wallet of wallets) {
            describe(wallet.getDescription(), async function () {

                it("wrap native", async () => {
                    let publicKey = await wallet.getPublicKey()
                    let startBalance = await network.getBalanceWrappedOnC(publicKey)
                    await network.wrapNative(wallet, testAmount)
                    let balance = await network.getBalanceWrappedOnC(publicKey)
                    assert.strictEqual(balance, startBalance + testAmount)
                })

                it("unwrap to native", async () => {
                    let publicKey = await wallet.getPublicKey()
                    let startBalance = await network.getBalanceWrappedOnC(publicKey)
                    await network.unwrapToNative(wallet, testAmount)
                    let balance = await network.getBalanceWrappedOnC(publicKey)
                    assert.strictEqual(balance, startBalance - testAmount)
                })
            })
        }
    })
}