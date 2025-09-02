import { describe, it } from "node:test";
import assert from "assert";
import { TestEnvironment } from "./env";
import { Amount } from "../../src";
import path from "path";
import { existsSync, readFileSync } from "fs";
import { TestDigestWallet } from "./wallet";

const TEST_VALIDATOR_FILE = path.join("test", "keys", "validator.json")
const submitTx = false

export function runAddValidatorOnPTests(env: TestEnvironment): void {
    describe("P chain validator tests", function () {
        let network = env.network

        it("validators on P", async () => {
            let validators = await network.getValidatorsOnP()
            if (validators.length > 0) {
                await network.getValidatorStakesOnP(validators[0].nodeId)
            }
        })

        it("add validator on P", async (t) => {
            if (!existsSync(TEST_VALIDATOR_FILE)) {
                t.skip(`Validator file ${TEST_VALIDATOR_FILE} not provided`)
                return
            }
            let validatorData = JSON.parse(readFileSync(TEST_VALIDATOR_FILE).toString())
            let stakeLimits = await network.getStakeLimits()

            let wallet = new TestDigestWallet(validatorData.privateKey)

            let nodeId = validatorData.nodeId
            let amount = stakeLimits.minStakeAmountValidator
            let now = BigInt((new Date()).getTime()) / BigInt(1e3)
            let startTimeDelay = BigInt(30)
            let validationPeriod = BigInt(60 * 24 * 60 * 60)
            let startTime = now + startTimeDelay
            let endTime = startTime + validationPeriod
            let delegationFee = Amount.percentages(20)

            let publicKey = await wallet.getPublicKey()
            let balanceOnP = await network.getBalanceOnP(publicKey)
            if (balanceOnP <= amount) {
                let minToKeepOnC = Amount.nats(10)
                let extraForFees = Amount.nats(1)
                let balanceOnC = await network.getBalanceOnC(publicKey)
                if (balanceOnP + balanceOnC - minToKeepOnC - extraForFees >= amount) {
                    await network.transferToP(wallet, amount - balanceOnP + extraForFees)
                } else {
                    t.skip("Insufficient balance for add validator test")
                    return
                }
            }

            let validatorsBefore = await network.getValidatorsOnP()
            let validatorExists = validatorsBefore.some(s => s.nodeId === nodeId)

            network.setBeforeTxSignatureCallback(async data => {
                data
                return true
            })
            network.setBeforeTxSubmissionCallback(async data => {
                data
                return !validatorExists && submitTx
            })

            await network.addValidatorOnP(
                wallet,
                amount,
                nodeId,
                startTime,
                endTime,
                delegationFee,
                validatorData.popBLSPublicKey,
                validatorData.popBLSSignature
            )

            network.setBeforeTxSignatureCallback(null)
            network.setBeforeTxSubmissionCallback(null)

            if (validatorExists) {
                t.skip(`Validator with node id ${nodeId} already exists`)
                return
            } else if (!validatorExists && submitTx) {
                let validatorsAfter = await network.getValidatorsOnP()
                let validator = validatorsAfter.find(s => s.nodeId === nodeId)
                assert.strictEqual(validator !== undefined, true)
                assert.strictEqual(validator.amount, amount)
                assert.strictEqual(validator.endTime, endTime)
                assert.strictEqual(validator.delegationFee, delegationFee)
                assert.strictEqual(validator.pAddress, network.getPAddress(publicKey))
            }
        })

    })
}