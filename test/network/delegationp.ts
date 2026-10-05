import { describe, it } from "node:test";
import assert from "node:assert";
import type { TestEnvironment } from "./env";
import { Amount } from "../../src";

export function runDelegationPTests(env: TestEnvironment): void {
  describe("P chain delegation tests", () => {
    const network = env.network;

    it("stake limits", async () => {
      await network.getStakeLimits();
    });

    it("stakes", async () => {
      await network.getStakesOnP();
    });

    const wallets = env.getAvaxWallets();

    for (const wallet of wallets) {
      describe(wallet.getDescription(), async () => {
        it("delegate on P", async (t) => {
          const publicKey = await wallet.getPublicKey();
          const balance = await network.getBalance(publicKey);
          const toStake = Amount.nats(5e4);
          const toKeep = Amount.gweis(1e6);
          if (balance.availableOnC + balance.notImportedToP + balance.availableOnP < toStake + toKeep) {
            t.skip("Insufficient balance for delegation test");
            return;
          }

          const now = BigInt(Date.now()) / BigInt(1e3);
          const startTimeDelay = BigInt(30);
          const delegationPeriod = BigInt(14 * 24 * 60 * 60);
          const startTime = now + startTimeDelay;
          const endTime = startTime + delegationPeriod;

          const stakes = await network.getValidatorsOnP();
          const validator = stakes.find((s) => s.endTime >= endTime);
          if (!validator) {
            t.skip("No suitable validator found");
            return;
          }

          await network.delegateOnP(wallet, toStake, validator.nodeId, startTime, endTime);
          // await Utils.sleep(Number(startTimeDelay) * 1e3)
          const stakedBalance = await network.getBalanceStakedOnP(publicKey);
          assert.strictEqual(stakedBalance, toStake);
        });
      });
    }
  });
}
