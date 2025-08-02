import { describe, it } from "node:test";
import assert from "assert";
import { TestEnvironment } from "./env"
import { FoundationProposalState, FoundationProposalSupport } from "../../src";
import { ethers } from "ethers";

export function runPollingTests(env: TestEnvironment): void {
    describe("Polling tests", function () {
        let network = env.network
        let wallets = env.getEvmWallets()

        let proposals: Array<bigint>

        it("proposals", async () => {
            proposals = await network.getFoundationProposalIds()
        })

        it("proposal info", async (t) => {
            if (proposals.length == 0) {
                t.skip("No proposal found")
                return
            }
            let info = await network.getFoundationProposalInfo(proposals[0])
            assert.strictEqual(info.votePowerBlock > 0, true, "proposal vote power block not set")
            assert.strictEqual(info.state === undefined && info.state !== 0, false, "proposal state not set")
        })

        it("current vote power", async () => {
            await network.getCurrentGovernanceVotePower(env.getCAddress(0))
        })

        it("vote power for proposal", async (t) => {            
            if (proposals.length == 0) {
                t.skip("No proposal found")
                return
            }
            let proposalId = proposals[proposals.length - 1]
            let info = await network.getFoundationProposalInfo(proposalId)
            if (info.state !== FoundationProposalState.PENDING && info.state !== FoundationProposalState.ACTIVE) {
                t.skip("No pending or acitve proposal found")
                return
            }
            await network.getVotePowerForFoundationProposal(env.getCAddress(0), proposalId)
        })

        it("current vote delegation", async () => {
            await network.getCurrentGovernanceVoteDelegate(env.getCAddress(0))
        })

        it("vote delegation for proposal", async (t) => {            
            if (proposals.length == 0) {
                t.skip("No proposal found")
                return
            }
            let proposalId = proposals[proposals.length - 1]
            let info = await network.getFoundationProposalInfo(proposalId)
            if (info.state !== FoundationProposalState.PENDING && info.state !== FoundationProposalState.ACTIVE) {
                t.skip("No pending or acitve proposal found")
                return
            }
            await network.getVotePowerForFoundationProposal(env.getCAddress(0), proposalId)
        })

        it("has voted", async (t) => {
            if (proposals.length == 0) {
                t.skip("No proposal found")
                return
            }
            await network.hasCastVoteForFoundationProposal(env.getCAddress(0), proposals[proposals.length - 1])
        })

        for (let wallet of wallets) {
            describe(wallet.getDescription(), async function () {

                it("cast vote", async (t) => {
                    if (proposals.length == 0) {
                        t.skip("No proposal found")
                        return
                    }
                    let proposalId = proposals[proposals.length - 1]
                    let info = await network.getFoundationProposalInfo(proposalId)
                    if (info.state !== FoundationProposalState.ACTIVE) {
                        t.skip("No acitve proposal found")
                        return
                    }
                    let publicKey = await wallet.getPublicKey()
                    let hasVoted = await network.hasCastVoteForFoundationProposal(publicKey, proposalId)
                    if (!hasVoted) {
                        await network.castVoteForFoundationProposal(wallet, proposalId, FoundationProposalSupport.FOR)
                    }
                })

                it ("delegate vote power", async () => {
                    let publicKey = await wallet.getPublicKey()
                    let delegate = env.getCAddress(1)
                    await network.delegateGovernanceVotePower(wallet, delegate)
                    let actualDelegate = await network.getCurrentGovernanceVoteDelegate(publicKey)
                    assert.strictEqual(actualDelegate, delegate, "unmatching delegates")
                })

                it ("undelegate vote power", async () => {
                    let publicKey = await wallet.getPublicKey()
                    await network.undelegateGovernanceVotePower(wallet)
                    let delegate = await network.getCurrentGovernanceVoteDelegate(publicKey)
                    assert.strictEqual(delegate, ethers.ZeroAddress, "delegate not null")
                })
            })
        }
    })
}