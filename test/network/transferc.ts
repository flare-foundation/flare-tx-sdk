import { describe, it } from "node:test";
import assert from "node:assert";
import type { TestEnvironment } from "./env";
import { Amount } from "../../src";

export function runTransferCTests(env: TestEnvironment): void {
  describe("C chain transfer tests", () => {
    const network = env.network;
    const wallets = env.getEvmWallets();

    const testAmount = Amount.gweis(10);

    for (const wallet of wallets) {
      describe(wallet.getDescription(), async () => {
        it("transfer native", async () => {
          const publicKey = await wallet.getPublicKey();
          const senderBalanceBefore = await network.getBalanceOnC(publicKey);
          const recipientBalanceBefore = await network.getBalanceOnC(env.getCAddress(1));
          await network.transferNative(wallet, env.getCAddress(1), testAmount);
          const senderBalanceAfter = await network.getBalanceOnC(publicKey);
          const recipientBalanceAfter = await network.getBalanceOnC(env.getCAddress(1));
          assert.strictEqual(true, senderBalanceBefore - testAmount > senderBalanceAfter, "incorrect sender balance");
          assert.strictEqual(recipientBalanceAfter, recipientBalanceBefore + testAmount, "incorrect recipient balance");
        });

        it("transfer wrapped", async () => {
          const publicKey = await wallet.getPublicKey();
          await network.wrapNative(wallet, testAmount);
          const senderBalanceBefore = await network.getBalanceWrappedOnC(publicKey);
          const recipientBalanceBefore = await network.getBalanceWrappedOnC(env.getCAddress(1));
          await network.transferWrapped(wallet, env.getCAddress(1), testAmount);
          const senderBalanceAfter = await network.getBalanceWrappedOnC(publicKey);
          const recipientBalanceAfter = await network.getBalanceWrappedOnC(env.getCAddress(1));
          assert.strictEqual(senderBalanceAfter, senderBalanceBefore - testAmount, "incorrect sender balance");
          assert.strictEqual(recipientBalanceAfter, recipientBalanceBefore + testAmount, "incorrect recipient balance");
        });
      });
    }
  });
}
