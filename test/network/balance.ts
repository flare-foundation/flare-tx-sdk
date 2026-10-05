import { describe, it } from "node:test";
import assert from "node:assert";
import type { TestEnvironment } from "./env";

export function runBalanceTests(env: TestEnvironment): void {
  const network = env.network;
  const wallet = env.getDigestWallet();

  describe("Balance tests", () => {
    it("balance on C", async () => {
      await network.getBalanceOnC(await wallet.getPublicKey());
    });

    it("balance on P", async () => {
      await network.getBalanceOnP(await wallet.getPublicKey());
    });

    it("balance wrapped on C", async () => {
      await network.getBalanceWrappedOnC(await wallet.getPublicKey());
    });

    it("balance staked on P", async () => {
      await network.getBalanceStakedOnP(await wallet.getPublicKey());
    });

    it("stakes on P", async () => {
      const publicKey = await wallet.getPublicKey();
      const stakes = await network.getStakesOnP(publicKey);
      const balance = await network.getBalanceStakedOnP(publicKey);
      const amount = stakes.map((s) => s.amount).reduce((sum, value) => sum + value, BigInt(0));
      assert.strictEqual(balance, amount, "staked amounts do not sum to the staked balance");
    });

    it("balance not imported to C", async () => {
      await network.getBalanceNotImportedToC(await wallet.getPublicKey());
    });

    it("balance not imported to P", async () => {
      await network.getBalanceNotImportedToP(await wallet.getPublicKey());
    });

    it("balance", async () => {
      await network.getBalance(await wallet.getPublicKey());
    });
  });
}
