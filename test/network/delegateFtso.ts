import { describe, it } from "node:test";
import assert from "node:assert";
import type { TestEnvironment } from "./env";
import { Amount } from "../../src";

export function runFtsoDelegationTests(env: TestEnvironment): void {
  describe("FTSO delegation tests", () => {
    const network = env.network;
    const wallets = env.getEvmWallets();

    const testShareBP = Amount.percentages(10);

    for (const wallet of wallets) {
      describe(wallet.getDescription(), async () => {
        it("delegate to one FTSO provider", async () => {
          const publicKey = await wallet.getPublicKey();
          await network.delegateToFtso(wallet, env.getCAddress(1), testShareBP);
          const delegates = await network.getFtsoDelegatesOf(publicKey);
          assert.strictEqual(delegates.length, 1, "there should be one delegate");
          assert.strictEqual(delegates[0].address, env.getCAddress(1), "invalid address");
          assert.strictEqual(delegates[0].shareBP, testShareBP, "invalid share amount");
        });

        it("delegate to two FTSO providers", async () => {
          const publicKey = await wallet.getPublicKey();
          await network.delegateToFtso(wallet, env.getCAddress(1), testShareBP, env.getCAddress(2), testShareBP);
          const delegates = await network.getFtsoDelegatesOf(publicKey);
          assert.strictEqual(delegates.length, 2, "there should be two delegates");
          assert.strictEqual(delegates[0].address, env.getCAddress(1), "invalid address");
          assert.strictEqual(delegates[0].shareBP, testShareBP, "invalid share amount");
          assert.strictEqual(delegates[1].address, env.getCAddress(2), "invalid address");
          assert.strictEqual(delegates[1].shareBP, testShareBP, "invalid share amount");
        });

        it("undelegate from FTSO providers", async () => {
          const publicKey = await wallet.getPublicKey();
          await network.undelegateFromFtso(wallet);
          const delegates = await network.getFtsoDelegatesOf(publicKey);
          assert.strictEqual(delegates.length, 0, "there should be no delegates");
        });
      });
    }
  });
}
