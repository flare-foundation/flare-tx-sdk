import { describe, it } from "node:test";
import assert from "assert";
import { TestEnvironment } from "./env"
import { RNatProject } from "../../src";

export function runRNatTests(env: TestEnvironment): void {
    describe("RNat tests", function () {
        let network = env.network
        let wallets = env.getEvmWallets()

        let projects: Array<RNatProject>

        it("projects", async () => {
            projects = await network.getRNatProjects()
        })

        it("project info", async (t) => {
            if (projects.length == 0) {
                t.skip("No RNat project found")
                return
            }
            let info = await network.getRNatProjectInfo(projects[0].id)
            assert.strictEqual(info.name, projects[0].name, "unmatching project name")
            assert.strictEqual(info.claimingDisabled, projects[0].claimingDisabled, "unmatching claiming info")
        })

        it("claimable rewards", async (t) => {
            if (projects.length == 0) {
                t.skip("No RNat projects found")
                return
            }
            await network.getClaimableRNatReward(projects[0].id, env.getCAddress(0))
        })

        for (let wallet of wallets) {
            describe(wallet.getDescription(), async function () {

                it("claim reward", async (t) => {
                    let projectId = projects.find(x => !x.claimingDisabled).id
                    if (!projectId && projectId !== 0) {
                        t.skip("No RNat project with claiming enabled")
                        return
                    }
                    let publicKey = await wallet.getPublicKey()
                    let cAddress = network.getCAddress(publicKey)
                    await network.claimRNatReward(wallet, [projectId])
                    let reward = await network.getClaimableRNatReward(projects[0].id, cAddress)
                    assert.strictEqual(reward, BigInt(0), "reward not claimed in full")
                })
            })
        }

        it("RNat account balance", async () => {
            let cAddress = env.getCAddress(0)
            let balance = await network.getRNatAccountBalance(cAddress)
            let unlocked = await network.getUnlockedBalanceWrappedOnRNatAccount(cAddress)
            let locked = await network.getLockedBalanceWrappedOnRNatAccount(cAddress)
            assert.strictEqual(balance.lockedBalance, locked)
            assert.strictEqual(balance.wNatBalance - balance.lockedBalance, unlocked)
        })

        for (let wallet of wallets) {
            describe(wallet.getDescription(), async function () {

                it("claim FlareDrop", async () => {
                    let publicKey = await wallet.getPublicKey()
                    let account = await network.getRNatAccount(publicKey)
                    let startUnlockedBalance = await network.getUnlockedBalanceWrappedOnRNatAccount(publicKey)
                    let reward = await network.getClaimableFlareDropReward(account)
                    await network.claimFlareDropReward(wallet, account, account, true)
                    let endUnlockedBalance = await network.getUnlockedBalanceWrappedOnRNatAccount(publicKey)
                    assert.strictEqual(endUnlockedBalance - startUnlockedBalance, reward, "unmatching FlareDrop reward")                   
                })

                it("withdraw", async () => {
                    let publicKey = await wallet.getPublicKey()
                    let startUnlocked = await network.getUnlockedBalanceWrappedOnRNatAccount(publicKey)
                    let wrap = Math.random() < 0.5
                    let startWrappedBalance = wrap ? await network.getBalanceWrappedOnC(publicKey) : BigInt(0)
                    await network.withdrawFromRNatAccount(wallet, undefined, wrap)
                    let endUnlocked = await network.getUnlockedBalanceWrappedOnRNatAccount(publicKey)
                    assert.strictEqual(endUnlocked, BigInt(0), "unlocked WNat balance not withdrawn in full")
                    if (wrap) {
                        let endWrappedBalance = await network.getBalanceWrappedOnC(publicKey)
                        assert.strictEqual(endWrappedBalance - startWrappedBalance, startUnlocked, "balance not wrapped on owner's account")
                    }
                })

                it("withdraw all", async () => {
                    let publicKey = await wallet.getPublicKey()
                    let startLocked = await network.getLockedBalanceWrappedOnRNatAccount(publicKey)
                    let startUnlocked = await network.getUnlockedBalanceWrappedOnRNatAccount(publicKey)
                    let wrap = Math.random() < 0.5
                    let startWrappedBalance = wrap ? await network.getBalanceWrappedOnC(publicKey) : BigInt(0)
                    await network.withdrawAllFromRNatAccount(wallet, wrap)
                    let endBalance = await network.getRNatAccountBalance(publicKey)
                    assert.strictEqual(endBalance.wNatBalance, BigInt(0), "WNat balance not withdrawn in full")
                    assert.strictEqual(endBalance.rNatBalance, BigInt(0), "RNat balance not withdrawn in full")
                    assert.strictEqual(endBalance.lockedBalance, BigInt(0), "locked balance not withdrawn in full")
                    if (wrap) {
                        let endWrappedBalance = await network.getBalanceWrappedOnC(publicKey)
                        assert.strictEqual(endWrappedBalance - startWrappedBalance, startUnlocked + startLocked / BigInt(2), "balance not wrapped on owner's account")
                    }
                })
            })
        }
    })
}