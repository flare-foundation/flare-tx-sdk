import { describe, it } from "node:test";
import assert from "node:assert";
import type { TestEnvironment } from "./env";
import { Amount } from "../../src";

export function runSmartAccountTests(env: TestEnvironment): void {
  describe("Smart account tests", async () => {
    const network = env.network;
    const indices = [0, 1, 2].sort(() => Math.random() - 0.5);
    const wallets = indices.map((index) => env.getDigestWallet(index));
    const owners = indices.map((index) => env.getCAddress(index));
    const threshold = BigInt(2);
    let smartAccount: string;
    const testAmount = Amount.nats(1);

    it("create smart account", async () => {
      smartAccount = await network.createSafeSmartAccount(wallets[0], owners, threshold);
    });

    it("get smart account", async () => {
      const account = await network.getSafeSmartAccount(smartAccount);
      assert.strictEqual(account.owners.length, owners.length, "invalid number of owners");
      assert.strictEqual(
        owners.every((owner) => account.owners.includes(owner)),
        true,
        "unmatching owner addresses"
      );
      assert.strictEqual(account.threshold, threshold, "invalid threshold");
    });

    it("transfer funds to smart account", async () => {
      await network.transferNative(wallets[1], smartAccount, testAmount);
      const balance = await network.getBalanceOnC(smartAccount);
      assert.strictEqual(balance, testAmount, "invalid balance");
    });

    it("wrap native funds on smart account", async () => {
      wallets[0].smartAccount = smartAccount;
      await network.wrapNative(wallets[0], testAmount);
      wallets[0].smartAccount = undefined;

      wallets[1].smartAccount = smartAccount;
      await network.wrapNative(wallets[1], testAmount);
      wallets[1].smartAccount = undefined;

      const balance = await network.getBalanceOnC(smartAccount);
      assert.strictEqual(balance, BigInt(0), "invalid balance");
      const wrappedBalance = await network.getBalanceWrappedOnC(smartAccount);
      assert.strictEqual(wrappedBalance, testAmount, "invalid wrapped balance");
    });

    it("unwrap funds to native on smart account", async () => {
      wallets[1].smartAccount = smartAccount;
      await network.unwrapToNative(wallets[1]);
      wallets[1].smartAccount = undefined;

      wallets[0].smartAccount = smartAccount;
      await network.unwrapToNative(wallets[0]);
      wallets[0].smartAccount = undefined;

      const wrappedBalance = await network.getBalanceWrappedOnC(smartAccount);
      assert.strictEqual(wrappedBalance, BigInt(0), "invalid wrapped balance");
      const balance = await network.getBalanceOnC(smartAccount);
      assert.strictEqual(balance, testAmount, "invalid balance");
    });

    it("transfer funds from smart account", async () => {
      const recipient = owners[1];
      const startBalanceRecipient = await network.getBalanceOnC(recipient);

      wallets[2].smartAccount = smartAccount;
      await network.transferAllNative(wallets[2], recipient);
      wallets[2].smartAccount = undefined;

      wallets[0].smartAccount = smartAccount;
      await network.transferAllNative(wallets[0], recipient);
      wallets[0].smartAccount = undefined;

      const balanceSmartAccount = await network.getBalanceOnC(smartAccount);
      assert.strictEqual(balanceSmartAccount, BigInt(0), "invalid balance on smart account");
      const endBalanceRecipient = await network.getBalanceOnC(recipient);
      assert.strictEqual(
        endBalanceRecipient,
        startBalanceRecipient + testAmount,
        "invalid balance on external account"
      );
    });
  });
}
