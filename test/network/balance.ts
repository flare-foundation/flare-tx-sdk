import { describe, it } from "node:test";
import assert from "assert";
import { TestEnvironment } from "./env";
import { Amount } from "../../src";

export function runBalanceTests(env: TestEnvironment): void {
    let network = env.network
    let wallet = env.getDigestWallet()

    describe("Balance tests", function () {

        it("balance on C", async function () {
            await network.getBalanceOnC(await wallet.getPublicKey())
            // await network.transferNative(env.getDigestWallet(1), env.getCAddress(0), Amount.nats(5))
            // await network.transferNative(env.getDigestWallet(1), env.getCAddress(2), Amount.nats(5))
        })

        it("balance on P", async function () {
            await network.getBalanceOnP(await wallet.getPublicKey())
        })

        it("balance wrapped on C", async function () {
            await network.getBalanceWrappedOnC(await wallet.getPublicKey())
        })

        it("balance staked on P", async function () {
            await network.getBalanceStakedOnP(await wallet.getPublicKey())
        })

        it("balance not imported to C", async function () {
            await network.getBalanceNotImportedToC(await wallet.getPublicKey())
        })

        it("balance not imported to P", async function () {
            await network.getBalanceNotImportedToP(await wallet.getPublicKey())
        })

        it("balance", async function () {
            await network.getBalance(await wallet.getPublicKey())
        })

        it("all stakes", async function () {
            await network.getStakesOnP()
        })

        it("individual stakes", async function () {
            let publicKey = await wallet.getPublicKey()
            let stakes = await network.getStakesOnP(publicKey)
            let balance = await network.getBalanceStakedOnP(publicKey)
            let amount = stakes.map(s => s.amount).reduce((sum, value) => sum + value, BigInt(0))
            assert.strictEqual(balance, amount, "staked amounts do not sum to the staked balance")
        })
    })
}