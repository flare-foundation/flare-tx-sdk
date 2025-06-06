import { describe, it } from "node:test";
import assert from "assert";
import { TestEnvironment } from "./env";

export function runStakingClaimTests(env: TestEnvironment): void {
    describe("Staking claim tests", function () {
        let network = env.network
        let wallets = env.getEvmWallets()

        for (let wallet of wallets) {
            describe(wallet.getDescription(), async function () {

                it("get claimable amount", async function () {
                    let publicKey = await wallet.getPublicKey()
                    await network.getClaimableStakingReward(publicKey)
                })

                it("claim reward", async function () {
                    let publicKey = await wallet.getPublicKey()
                    let recipient = env.cAddress1
                    let wrap = Math.random() < 0.5
                    let startBalance = wrap ? await network.getBalanceWrappedOnC(recipient) : await network.getBalanceOnC(recipient)
                    let reward = await network.getClaimableStakingReward(publicKey)                    
                    await network.claimStakingReward(wallet, null, recipient, wrap)
                    let endBalance = wrap ? await network.getBalanceWrappedOnC(recipient) : await network.getBalanceOnC(recipient)
                    assert.strictEqual(endBalance, startBalance + reward, `invalid${wrap ? " wrapped" : ""} balance after reward claiming`)
                })
            })
        }
    })
}