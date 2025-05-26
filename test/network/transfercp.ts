import { describe, it } from "node:test";
import assert from "assert";
import { TestEnvironment } from "./env";
import { Amount } from "../../src";

export function runTransferCPTests(env: TestEnvironment): void {
    describe("C/P chain transfer tests", function () {
        let network = env.network
        let wallets = env.getAvaxWallets()

        let testAmount = Amount.nats(1)

        for (let wallet of wallets) {
            describe(wallet.getDescription(), async function () {

                it("transfer to P", async () => {
                    let publicKey = await wallet.getPublicKey()
                    let startBalanceOnP = await network.getBalanceOnP(publicKey)
                    await network.transferToP(wallet, testAmount)
                    let balanceOnP = await network.getBalanceOnP(publicKey)
                    assert.strictEqual(balanceOnP, startBalanceOnP + testAmount)
                })

                it("transfer to C", async () => {
                    await network.transferToC(wallet)
                    let publicKey = await wallet.getPublicKey()
                    let balanceOnP = await network.getBalanceOnP(publicKey)
                    assert.strictEqual(BigInt(0), balanceOnP)
                })

                it("export from C", async function () {
                    await network.exportFromC(wallet, testAmount)
                    let publicKey = await wallet.getPublicKey()
                    let balanceNotImportedToP = await network.getBalanceNotImportedToP(publicKey)
                    assert.strictEqual(true, balanceNotImportedToP > BigInt(0))
                })

                it("import to P", async function () {
                    await network.importToP(wallet)
                    let publicKey = await wallet.getPublicKey()
                    let balanceNotImportedToP = await network.getBalanceNotImportedToP(publicKey)
                    assert.strictEqual(BigInt(0), balanceNotImportedToP)
                })

                it("export from P", async function () {
                    let publicKey = await wallet.getPublicKey()
                    let startBalanceOnP = await network.getBalanceOnP(publicKey)
                    let txFeeOnP = await network.getBaseTxFeeOnP()
                    await network.exportFromP(wallet, startBalanceOnP - txFeeOnP)
                    let balanceNotImportedToC = await network.getBalanceNotImportedToC(publicKey)
                    assert.strictEqual(true, balanceNotImportedToC > BigInt(0))
                })

                it("import to C", async function () {
                    await network.importToC(wallet)
                    let publicKey = await wallet.getPublicKey()
                    let balanceNotImportedToC = await network.getBalanceNotImportedToC(publicKey)
                    assert.strictEqual(BigInt(0), balanceNotImportedToC)
                })
            })
        }

    })
}