import { describe, it } from "node:test";
import assert from "assert";
import { TestEnvironment } from "./env";

export function runSmartAccountTests(env: TestEnvironment): void {
    describe("Smart account tests", async function () {
        let network = env.network
        let wallet = env.getDigestWallet()
        let publicKey = await wallet.getPublicKey()
        let cAddress = network.getCAddress(publicKey)
        let owners = [cAddress, env.cAddress1]
        let threshold = BigInt(1)
        let smartAccount: string

        it("create Safe smart account", async function () {
            smartAccount = await network.createSafeSmartAccount(wallet, owners, threshold)
        })

        it("get Safe smart account", async function () {
            let account = await network.getSafeSmartAccount(smartAccount)
            assert.strictEqual(account.owners.length, owners.length, "invalid number of owners")
            assert.strictEqual(owners.every(owner => account.owners.includes(owner)), true, "unmatching owner addresses")
            assert.strictEqual(account.threshold, threshold, "invalid threshold")
        })
    })

}