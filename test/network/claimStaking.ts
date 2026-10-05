import { describe, it } from "node:test";
import assert from "node:assert";
import type { TestEnvironment } from "./env";

export function runStakingClaimTests(env: TestEnvironment): void {
  describe("Staking claim tests", () => {
    const network = env.network;
    const wallets = env.getEvmWallets();

    for (const wallet of wallets) {
      describe(wallet.getDescription(), async () => {
        it("get claimable amount", async () => {
          const publicKey = await wallet.getPublicKey();
          await network.getClaimableStakingReward(publicKey);
        });

        it("claim reward", async () => {
          const publicKey = await wallet.getPublicKey();
          const recipient = env.getCAddress(1);
          const wrap = Math.random() < 0.5;
          const startBalance = wrap
            ? await network.getBalanceWrappedOnC(recipient)
            : await network.getBalanceOnC(recipient);
          const reward = await network.getClaimableStakingReward(publicKey);
          await network.claimStakingReward(wallet, null, recipient, wrap);
          const endBalance = wrap
            ? await network.getBalanceWrappedOnC(recipient)
            : await network.getBalanceOnC(recipient);
          assert.strictEqual(
            endBalance,
            startBalance + reward,
            `invalid${wrap ? " wrapped" : ""} balance after reward claiming`
          );
        });
      });
    }
  });
}
