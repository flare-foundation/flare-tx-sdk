import { describe, it } from "node:test";
import assert from "node:assert";
import type { TestEnvironment } from "./env";
import { Amount } from "../../src";

export function runGenericContractTests(env: TestEnvironment): void {
  describe("Generic contract tests", () => {
    const network = env.network;
    const wallets = env.getEvmWallets();

    const testAmount = Amount.nats(1);
    const abi = `[ { "inputs": [ { "internalType": "address", "name": "account", "type": "address" } ], "name": "balanceOf", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "_to", "type": "address" }, { "internalType": "uint256", "name": "_bips", "type": "uint256" } ], "name": "delegate", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "deposit", "outputs": [], "stateMutability": "payable", "type": "function" }]`;

    for (const wallet of wallets) {
      describe(wallet.getDescription(), () => {
        it("contract call", async () => {
          const publicKey = await wallet.getPublicKey();
          const address = network.getCAddress(publicKey);
          await network.wrapNative(wallet, testAmount);
          const balance1 = await network.getBalanceWrappedOnC(publicKey);
          const balance2 = await network.invokeContractCallOnC("WNat", abi, "balanceOf", address);
          await network.unwrapToNative(wallet, testAmount);
          assert.strictEqual(balance1, balance2, "unmatching wrapped balance");
        });

        it("payable contract method", async () => {
          const publicKey = await wallet.getPublicKey();
          const startBalance = await network.getBalanceWrappedOnC(publicKey);
          await network.invokeContractMethodOnC(wallet, "WNat", abi, "deposit", testAmount);
          const currentBalance = await network.getBalanceWrappedOnC(publicKey);
          assert.strictEqual(currentBalance, startBalance + testAmount, "unmatching wrapped balance");
          await network.unwrapToNative(wallet, testAmount);
        });

        it("unpayable contract method", async () => {
          const publicKey = await wallet.getPublicKey();
          await network.undelegateFromFtso(wallet);
          const bips = Amount.percentages(50);
          await network.invokeContractMethodOnC(wallet, "WNat", abi, "delegate", BigInt(0), env.getCAddress(1), bips);
          const delegates = await network.getFtsoDelegatesOf(publicKey);
          assert.strictEqual(delegates.length, 1, "invalid number of delegates");
          assert.strictEqual(delegates[0].address, env.getCAddress(1), "invalid delegate");
          assert.strictEqual(delegates[0].shareBP, bips, "invalid share");
          await network.undelegateFromFtso(wallet);
        });
      });
    }
  });
}
