import { describe, it } from "node:test";
import assert from "assert";
import { TestEnvironment } from "./env";
import { Amount } from "../../src";

export function runTransferCTests(env: TestEnvironment): void {
    describe("C chain transfer tests", function () {
            let network = env.network
            let wallets = env.getEvmWallets()

            let testAmount = Amount.gweis(10)
    
            for (let wallet of wallets) {
                describe(wallet.getDescription(), async function () {
    
                    it("transfer native", async () => {
                        let publicKey = await wallet.getPublicKey()
                        let senderBalanceBefore = await network.getBalanceOnC(publicKey)
                        let recipientBalanceBefore = await network.getBalanceOnC(env.address1)
                        await network.transferNative(wallet, env.address1, testAmount)
                        let senderBalanceAfter = await network.getBalanceOnC(publicKey)
                        let recipientBalanceAfter = await network.getBalanceOnC(env.address1)
                        assert.strictEqual(true, senderBalanceBefore - testAmount > senderBalanceAfter, "incorrect sender balance")
                        assert.strictEqual(recipientBalanceAfter, recipientBalanceBefore + testAmount, "incorrect recipient balance")
                    })
                    
                    it("transfer wrapped", async () => {
                        let publicKey = await wallet.getPublicKey()
                        await network.wrapNative(wallet, testAmount)
                        let senderBalanceBefore = await network.getBalanceWrappedOnC(publicKey)
                        let recipientBalanceBefore = await network.getBalanceWrappedOnC(env.address1)
                        await network.transferWrapped(wallet, env.address1, testAmount)
                        let senderBalanceAfter = await network.getBalanceWrappedOnC(publicKey)
                        let recipientBalanceAfter = await network.getBalanceWrappedOnC(env.address1)
                        assert.strictEqual(senderBalanceAfter, senderBalanceBefore - testAmount, "incorrect sender balance")
                        assert.strictEqual(recipientBalanceAfter, recipientBalanceBefore + testAmount, "incorrect recipient balance")
                    })
                })
            }
        })
}