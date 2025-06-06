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

                it("claim reward", async function (t) {
                    let publicKey = await wallet.getPublicKey()

                    let reward = await network.getClaimableFtsoReward(publicKey)
                    if (reward == BigInt(0)) {
                        let states = await network.getStateOfFtsoRewards(publicKey)
                        let canClaim = false
                        for (let epochStates of states) {
                            if (epochStates.length == 0) {
                                continue
                            }
                            canClaim = epochStates.every(s => s.initialised)
                            break
                        }
                        if (!canClaim) {
                            t.skip("No reward epochs with initialised rewards")
                            return
                        }
                    }

                    let recipient = env.cAddress1
                    let wrap = Math.random() < 0.5
                    let startBalance = wrap ? await network.getBalanceWrappedOnC(recipient) : await network.getBalanceOnC(recipient)

                    await network.claimFtsoReward(wallet, null, recipient, wrap)
                    let endBalance = wrap ? await network.getBalanceWrappedOnC(recipient) : await network.getBalanceOnC(recipient)
                    assert.strictEqual(endBalance, startBalance + reward, `invalid${wrap ? " wrapped" : ""} balance after reward claiming`)
                })

                /*
                it("claim reward with proofs", async function () {
                    let proofs = new Array<FtsoRewardClaimWithProof>()
                    proofs.push({
                            merkleProof: [
                                ],
                            body: {
                                beneficiary: "",
                                claimType: 1,
                                amount: BigInt(0),
                                rewardEpochId: BigInt(0)
                            }
                        })
                    let reward = proofs.reduce((v, s) => { return v + s.body.amount }, BigInt(0))

                    let recipient = env.address1
                    let wrap = Math.random() < 0.5
                    let startBalance = wrap ? await network.getBalanceWrappedOnC(recipient) : await network.getBalanceOnC(recipient)

                    await network.claimFtsoReward(wallet, null, recipient, wrap, proofs)
                    let endBalance = wrap ? await network.getBalanceWrappedOnC(recipient) : await network.getBalanceOnC(recipient)
                    assert.strictEqual(endBalance, startBalance + reward, `invalid${wrap ? " wrapped" : ""} balance after reward claiming`)
                })
                */
            })
        }
    })
}