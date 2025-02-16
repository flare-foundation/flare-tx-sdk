import { describe, it } from "node:test";
import assert from "assert";
import { TestEnvironment } from "./env";
import { Amount } from "../src";

export function runDelegationPTests(env: TestEnvironment): void {
    describe("P chain delegation tests", function () {
        let network = env.network
        let wallets = env.getAvaxWallets()

        for (let wallet of wallets) {
            describe(wallet.getDescription(), async function () {

                it("delegate on P", async (t) => {
                    let publicKey = await wallet.getPublicKey()
                    let balance = await network.getBalance(publicKey)
                    let toStake = Amount.nats(5e4)
                    let toKeep = Amount.nats(10)
                    if (balance.availableOnC + balance.notImportedToP + balance.availableOnP < toStake + toKeep) {
                        t.skip("Insufficient balance for delegation test")
                        return
                    }
                    let stakes = await network.getStakesOnP()
                    let validator = stakes.find(s => s.type === "validator")
                    if (!validator) {
                        t.skip("No suitable validator found")
                        return
                    }
                    let now = BigInt((new Date()).getTime()) / BigInt(1e3)
                    let startTimeDelay = BigInt(30)
                    let delegationPeriod = BigInt(14 * 24 * 60 * 60)
                    let startTime = now + startTimeDelay
                    let endTime = startTime + delegationPeriod
                    await network.delegateOnP(wallet, toStake, validator.nodeId, startTime, endTime)
                    // await Utils.sleep(Number(startTimeDelay) * 1e3)
                    let stakedBalance = await network.getBalanceStakedOnP(publicKey)
                    assert.strictEqual(stakedBalance, toStake)
                })

            })
        }

    })
}