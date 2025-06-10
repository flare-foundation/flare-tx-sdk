import { describe, it } from "node:test";
import assert from "assert";
import { TestEnvironment } from "./env";

export function runFlareDropClaimTests(env: TestEnvironment): void {
    describe("FlareDrop claim tests", function () {
        let network = env.network
        let wallets = env.getEvmWallets()

        for (let wallet of wallets) {
            describe(wallet.getDescription(), async function () {

                it("get claimable amount", async function () {
                    let publicKey = await wallet.getPublicKey()
                    await network.getClaimableFlareDropReward(publicKey)
                })

                it("claim reward", async function () {
                    let publicKey = await wallet.getPublicKey()
                    let recipient = env.getCAddress(1)
                    let wrap = Math.random() < 0.5
                    let startBalance = wrap ? await network.getBalanceWrappedOnC(recipient) : await network.getBalanceOnC(recipient)
                    let reward = await network.getClaimableFlareDropReward(publicKey)                    
                    await network.claimFlareDropReward(wallet, null, recipient, wrap)
                    let endBalance = wrap ? await network.getBalanceWrappedOnC(recipient) : await network.getBalanceOnC(recipient)
                    assert.strictEqual(endBalance, startBalance + reward, `invalid${wrap ? " wrapped" : ""} balance after reward claiming`)
                })
            })
        }
    })
}