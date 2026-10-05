import { describe, it } from "node:test";
import assert from "node:assert";
import type { TestEnvironment } from "./env";
import { Amount } from "../../src";

export function runWNatTests(env: TestEnvironment): void {
  describe("WNat tests", () => {
    const network = env.network;
    const wallets = env.getEvmWallets();

    const testAmount = Amount.nats(1);

    for (const wallet of wallets) {
      describe(wallet.getDescription(), async () => {
        it("wrap native", async () => {
          const publicKey = await wallet.getPublicKey();
          const startBalance = await network.getBalanceWrappedOnC(publicKey);
          await network.wrapNative(wallet, testAmount);
          const balance = await network.getBalanceWrappedOnC(publicKey);
          assert.strictEqual(balance, startBalance + testAmount);
        });

        it("unwrap to native", async () => {
          const publicKey = await wallet.getPublicKey();
          const startBalance = await network.getBalanceWrappedOnC(publicKey);
          await network.unwrapToNative(wallet, testAmount);
          const balance = await network.getBalanceWrappedOnC(publicKey);
          assert.strictEqual(balance, startBalance - testAmount);
        });
      });
    }
  });
}
