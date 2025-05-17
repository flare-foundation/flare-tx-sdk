import { describe, it } from "node:test";
import assert from "assert";
import { TestEnvironment } from "./env";

export function runFtsoClaimTests(env: TestEnvironment): void {
    describe("FTSO claim tests", function () {
        let network = env.network
        let wallets = env.getEvmWallets()

        for (let wallet of wallets) {
            describe(wallet.getDescription(), async function () {

                it("get state of rewards", async function () {
                    let publicKey = await wallet.getPublicKey()
                    await network.getStateOfFtsoRewards(publicKey)
                })

                it("get claimable amount", async function () {
                    let publicKey = await wallet.getPublicKey()
                    await network.getClaimableFtsoReward(publicKey)
                })

                it("claim reward", async function () {
                    let publicKey = await wallet.getPublicKey()
                    let recipient = env.address1
                    let wrap = Math.random() < 0.5
                    let startBalance = wrap ? await network.getBalanceWrappedOnC(recipient) : await network.getBalanceOnC(recipient)
                    let reward = await network.getClaimableFtsoReward(publicKey)                    
                    await network.claimFtsoReward(wallet, null, recipient, wrap)
                    let endBalance = wrap ? await network.getBalanceWrappedOnC(recipient) : await network.getBalanceOnC(recipient)
                    assert.strictEqual(endBalance, startBalance + reward, `invalid${wrap ? " wrapped" : ""} balance after reward claiming`)
                })
            })
        }
    })
}