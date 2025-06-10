import { describe, it } from "node:test";
import assert from "assert";
import { TestEnvironment } from "./env";
import { Amount } from "../../src";

export function runSmartAccountTests(env: TestEnvironment): void {
    describe("Smart account tests", async function () {
        let network = env.network
        let indices = [0, 1, 2].sort(() => Math.random() - 0.5)
        let wallets = indices.map(index => env.getDigestWallet(index))
        let owners = indices.map(index => env.getCAddress(index))
        let threshold = BigInt(2)
        let smartAccount: string
        let testAmount = Amount.nats(1)

        it("create smart account", async function () {
            smartAccount = await network.createSafeSmartAccount(wallets[0], owners, threshold)
        })

        it("get smart account", async function () {
            let account = await network.getSafeSmartAccount(smartAccount)
            assert.strictEqual(account.owners.length, owners.length, "invalid number of owners")
            assert.strictEqual(owners.every(owner => account.owners.includes(owner)), true, "unmatching owner addresses")
            assert.strictEqual(account.threshold, threshold, "invalid threshold")
        })

        it("transfer funds to smart account", async function () {
            await network.transferNative(wallets[1], smartAccount, testAmount)
            let balance = await network.getBalanceOnC(smartAccount)
            assert.strictEqual(balance, testAmount, "invalid balance")
        })

        it("wrap native funds on smart account", async function () {
            wallets[0].smartAccount = smartAccount
            await network.wrapNative(wallets[0], testAmount)
            wallets[0].smartAccount = undefined

            wallets[1].smartAccount = smartAccount
            await network.wrapNative(wallets[1], testAmount)
            wallets[1].smartAccount = undefined

            let balance = await network.getBalanceOnC(smartAccount)
            assert.strictEqual(balance, BigInt(0), "invalid balance")
            let wrappedBalance = await network.getBalanceWrappedOnC(smartAccount)
            assert.strictEqual(wrappedBalance, testAmount, "invalid wrapped balance")
        })

        it("unwrap funds to native on smart account", async function () {
            wallets[1].smartAccount = smartAccount
            await network.unwrapToNative(wallets[1])
            wallets[1].smartAccount = undefined

            wallets[0].smartAccount = smartAccount
            await network.unwrapToNative(wallets[0])
            wallets[0].smartAccount = undefined

            let wrappedBalance = await network.getBalanceWrappedOnC(smartAccount)
            assert.strictEqual(wrappedBalance, BigInt(0), "invalid wrapped balance")
            let balance = await network.getBalanceOnC(smartAccount)
            assert.strictEqual(balance, testAmount, "invalid balance")
        })

        it("transfer funds from smart account", async function () {
            let recipient = owners[1]
            let startBalanceRecipient = await network.getBalanceOnC(recipient)

            wallets[2].smartAccount = smartAccount
            await network.transferAllNative(wallets[2], recipient)
            wallets[2].smartAccount = undefined

            wallets[0].smartAccount = smartAccount
            await network.transferAllNative(wallets[0], recipient)
            wallets[0].smartAccount = undefined

            let balanceSmartAccount = await network.getBalanceOnC(smartAccount)
            assert.strictEqual(balanceSmartAccount, BigInt(0), "invalid balance on smart account")
            let endBalanceRecipient = await network.getBalanceOnC(recipient)
            assert.strictEqual(endBalanceRecipient, startBalanceRecipient + testAmount, "invalid balance on external account")
        })

    })

}