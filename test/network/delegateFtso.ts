import { describe, it } from "node:test";
import assert from "assert";
import { TestEnvironment } from "./env";
import { Amount } from "../../src";

export function runFtsoDelegationTests(env: TestEnvironment): void {
    describe("FTSO delegation tests", function () {
        let network = env.network
        let wallets = env.getEvmWallets()

        let testAmount = Amount.nats(1)
        let testShareBP = Amount.percentages(10)

        for (let wallet of wallets) {
            describe(wallet.getDescription(), async function () {

                it("delegate to one FTSO provider", async function () {
                    let publicKey = await wallet.getPublicKey()
                    await network.delegateToFtso(wallet, env.address1, testShareBP)
                    let delegates = await network.getFtsoDelegatesOf(publicKey)
                    assert.strictEqual(delegates.length, 1, "there should be one delegate")
                    assert.strictEqual(delegates[0].address, env.address1, "invalid address")
                    assert.strictEqual(delegates[0].shareBP, testShareBP, "invalid share amount")
                })

                it("delegate to two FTSO providers", async function () {
                    let publicKey = await wallet.getPublicKey()
                    await network.delegateToFtso(wallet, env.address1, testShareBP, env.address2, testShareBP)
                    let delegates = await network.getFtsoDelegatesOf(publicKey)
                    assert.strictEqual(delegates.length, 2, "there should be two delegates")
                    assert.strictEqual(delegates[0].address, env.address1, "invalid address")
                    assert.strictEqual(delegates[0].shareBP, testShareBP, "invalid share amount")
                    assert.strictEqual(delegates[1].address, env.address2, "invalid address")
                    assert.strictEqual(delegates[1].shareBP, testShareBP, "invalid share amount")
                })

                it("undelegate from FTSO providers", async function () {
                    let publicKey = await wallet.getPublicKey()
                    await network.undelegateFromFtso(wallet)
                    let delegates = await network.getFtsoDelegatesOf(publicKey)
                    assert.strictEqual(delegates.length, 0, "there should be no delegates")
                })
            })
        }
    })
}