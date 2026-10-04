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

        it("projects and claimable rewards", async () => {
            let cAddress = env.getCAddress(0)
            let result = await network.getRNatProjectsAndClaimableRewards(cAddress)
            assert.strictEqual(result.length, projects.length, "unmatching number of projects")
            for (let i = 0; i < result.length; i++) {
                assert.strictEqual(result[i].id, projects[i].id, "unmatching project id")
                assert.strictEqual(result[i].name, projects[i].name, "unmatching project name")
                assert.strictEqual(result[i].claimingDisabled, projects[i].claimingDisabled, "unmatching claiming info")
                let reward = await network.getClaimableRNatReward(projects[i].id, cAddress)
                assert.strictEqual(result[i].claimableReward, reward, "unmatching claimable reward")
            }
        })

        for (let wallet of wallets) {
            describe(wallet.getDescription(), async function () {

                it("claim reward", async (t) => {
                    let project = projects.find(x => !x.claimingDisabled)
                    if (!project) {
                        t.skip("No RNat project with claiming enabled")
                        return
                    }
                    let projectId = project.id
                    let publicKey = await wallet.getPublicKey()
                    let cAddress = network.getCAddress(publicKey)
                    await network.claimRNatReward(wallet, [projectId])
                    let reward = await network.getClaimableRNatReward(projectId, cAddress)
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