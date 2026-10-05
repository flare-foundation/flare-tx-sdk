import { describe, it } from "node:test";
import assert from "node:assert";
import type { TestEnvironment } from "./env";
import { FoundationProposalState } from "../../src";
import { ethers } from "ethers";
import { randomInt } from "node:crypto";

export function runPollingTests(env: TestEnvironment): void {
  describe("Polling tests", () => {
    const network = env.network;
    const wallets = env.getEvmWallets();

    let proposals: Array<bigint>;

    it("proposals", async () => {
      proposals = await network.getFoundationProposalIds();
    });

    it("proposal info", async (t) => {
      if (proposals.length === 0) {
        t.skip("No proposal found");
        return;
      }
      const info = await network.getFoundationProposalInfo(proposals[0]);
      assert.strictEqual(info.votePowerBlock > 0, true, "proposal vote power block not set");
      assert.strictEqual(info.state === undefined && info.state !== 0, false, "proposal state not set");
    });

    it("current vote power", async () => {
      await network.getCurrentGovernanceVotePower(env.getCAddress(0));
    });

    it("vote power for proposal", async (t) => {
      if (proposals.length === 0) {
        t.skip("No proposal found");
        return;
      }
      const proposalId = proposals[proposals.length - 1];
      const info = await network.getFoundationProposalInfo(proposalId);
      if (info.state !== FoundationProposalState.PENDING && info.state !== FoundationProposalState.ACTIVE) {
        t.skip("Found no pending or acitve proposal");
        return;
      }
      await network.getVotePowerForFoundationProposal(env.getCAddress(0), proposalId);
    });

    it("current vote delegation", async () => {
      await network.getCurrentGovernanceVoteDelegate(env.getCAddress(0));
    });

    it("vote delegation for proposal", async (t) => {
      if (proposals.length === 0) {
        t.skip("No proposal found");
        return;
      }
      const proposalId = proposals[proposals.length - 1];
      const info = await network.getFoundationProposalInfo(proposalId);
      if (info.state !== FoundationProposalState.PENDING && info.state !== FoundationProposalState.ACTIVE) {
        t.skip("Found no pending or acitve proposal");
        return;
      }
      await network.getVoteDelegateForFoundationProposal(env.getCAddress(0), proposalId);
    });

    it("has voted", async (t) => {
      if (proposals.length === 0) {
        t.skip("No proposal found");
        return;
      }
      await network.hasCastVoteForFoundationProposal(env.getCAddress(0), proposals[proposals.length - 1]);
    });

    for (const wallet of wallets) {
      describe(wallet.getDescription(), async () => {
        it("cast vote", async (t) => {
          if (proposals.length === 0) {
            t.skip("No proposal found");
            return;
          }
          const publicKey = await wallet.getPublicKey();

          let proposalId: bigint | undefined;
          for (let i = proposals.length - 1; i >= 0; i--) {
            const hasVoted = await network.hasCastVoteForFoundationProposal(publicKey, proposals[i]);
            if (hasVoted) {
              continue;
            }
            const info = await network.getFoundationProposalInfo(proposals[i]);
            if (info.state === FoundationProposalState.PENDING) {
              continue;
            } else if (info.state === FoundationProposalState.ACTIVE) {
              proposalId = proposals[i];
            }
            break;
          }
          if (!proposalId) {
            t.skip("Found no suitable proposal to cast vote");
            return;
          }
          await network.castVoteForFoundationProposal(wallet, proposalId, randomInt(0, 2));
          const voted = await network.hasCastVoteForFoundationProposal(publicKey, proposalId);
          assert.strictEqual(voted, true, "vote not cast");
        });

        it("delegate vote power", async () => {
          const publicKey = await wallet.getPublicKey();
          const delegate = env.getCAddress(1);
          await network.delegateGovernanceVotePower(wallet, delegate);
          const actualDelegate = await network.getCurrentGovernanceVoteDelegate(publicKey);
          assert.strictEqual(actualDelegate, delegate, "unmatching delegates");
        });

        it("undelegate vote power", async () => {
          const publicKey = await wallet.getPublicKey();
          await network.undelegateGovernanceVotePower(wallet);
          const delegate = await network.getCurrentGovernanceVoteDelegate(publicKey);
          assert.strictEqual(delegate, ethers.ZeroAddress, "delegate not null");
        });
      });
    }
  });
}
