import { describe, it } from "node:test";
import assert from "node:assert";
import type { TestEnvironment } from "./env";
import { Amount } from "../../src";

export function runTransferCPTests(env: TestEnvironment): void {
  describe("C/P chain transfer tests", () => {
    const network = env.network;
    const wallets = env.getAvaxWallets();

    const testAmount = Amount.nats(1);

    for (const wallet of wallets) {
      describe(wallet.getDescription(), async () => {
        it("transfer to P", async () => {
          const publicKey = await wallet.getPublicKey();
          const startBalanceOnP = await network.getBalanceOnP(publicKey);
          await network.transferToP(wallet, testAmount);
          const balanceOnP = await network.getBalanceOnP(publicKey);
          assert.strictEqual(balanceOnP >= startBalanceOnP + testAmount, true);
        });

        it("transfer on P", async () => {
          const publicKey = await wallet.getPublicKey();
          const startBalanceOnP = await network.getBalanceOnP(publicKey);
          const amount = testAmount / BigInt(100);
          await network.transferOnP(wallet, env.getPAddress(1), amount);
          const balanceOnP = await network.getBalanceOnP(publicKey);
          assert.strictEqual(balanceOnP < startBalanceOnP - amount, true);
        });

        it("transfer to C", async () => {
          await network.transferToC(wallet);
          const publicKey = await wallet.getPublicKey();
          const balanceOnP = await network.getBalanceOnP(publicKey);
          assert.strictEqual(balanceOnP <= Amount.nats(1), true);
        });

        it("export from C", async () => {
          await network.exportFromC(wallet, testAmount);
          const publicKey = await wallet.getPublicKey();
          const balanceNotImportedToP = await network.getBalanceNotImportedToP(publicKey);
          assert.strictEqual(true, balanceNotImportedToP > BigInt(0));
        });

        it("import to P", async () => {
          await network.importToP(wallet);
          const publicKey = await wallet.getPublicKey();
          const balanceNotImportedToP = await network.getBalanceNotImportedToP(publicKey);
          assert.strictEqual(BigInt(0), balanceNotImportedToP);
        });

        it("export from P", async () => {
          const publicKey = await wallet.getPublicKey();
          const startBalanceOnP = await network.getBalanceOnP(publicKey);
          const txFeeOnP = Amount.gweis(1e8);
          await network.exportFromP(wallet, startBalanceOnP - txFeeOnP);
          const balanceNotImportedToC = await network.getBalanceNotImportedToC(publicKey);
          assert.strictEqual(true, balanceNotImportedToC > BigInt(0));
        });

        it("import to C", async () => {
          await network.importToC(wallet);
          const publicKey = await wallet.getPublicKey();
          const balanceNotImportedToC = await network.getBalanceNotImportedToC(publicKey);
          assert.strictEqual(BigInt(0), balanceNotImportedToC);
        });
      });
    }
  });
}
