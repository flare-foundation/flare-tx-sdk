import { describe, it } from "node:test";
import assert from "node:assert";
import type { TestEnvironment } from "./env";
import { Amount } from "../../src";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { TestDigestWallet } from "./wallet";

const TEST_VALIDATOR_FILE = path.join("test", "keys", "validator.json");
const submitTx = false;

export function runAddValidatorOnPTests(env: TestEnvironment): void {
  describe("P chain validator tests", () => {
    const network = env.network;

    it("validators on P", async () => {
      const validators = await network.getValidatorsOnP();
      if (validators.length > 0) {
        await network.getValidatorStakesOnP(validators[0].nodeId);
      }
    });

    it("add validator on P", async (t) => {
      if (!existsSync(TEST_VALIDATOR_FILE)) {
        t.skip(`Validator file ${TEST_VALIDATOR_FILE} not provided`);
        return;
      }
      const validatorData = JSON.parse(readFileSync(TEST_VALIDATOR_FILE).toString());
      const stakeLimits = await network.getStakeLimits();

      const wallet = new TestDigestWallet(validatorData.privateKey);

      const nodeId = validatorData.nodeId;
      const amount = stakeLimits.minStakeAmountValidator;
      const now = BigInt(Date.now()) / BigInt(1e3);
      const startTimeDelay = BigInt(30);
      const validationPeriod = BigInt(60 * 24 * 60 * 60);
      const startTime = now + startTimeDelay;
      const endTime = startTime + validationPeriod;
      const delegationFee = Amount.percentages(20);

      const publicKey = await wallet.getPublicKey();
      const balanceOnP = await network.getBalanceOnP(publicKey);
      if (balanceOnP <= amount) {
        const minToKeepOnC = Amount.nats(10);
        const extraForFees = Amount.nats(1);
        const balanceOnC = await network.getBalanceOnC(publicKey);
        if (balanceOnP + balanceOnC - minToKeepOnC - extraForFees >= amount) {
          await network.transferToP(wallet, amount - balanceOnP + extraForFees);
        } else {
          t.skip("Insufficient balance for add validator test");
          return;
        }
      }

      const validatorsBefore = await network.getValidatorsOnP();
      const validatorExists = validatorsBefore.some((s) => s.nodeId === nodeId);

      network.setBeforeTxSignatureCallback(async (data) => {
        data;
        return true;
      });
      network.setBeforeTxSubmissionCallback(async (data) => {
        data;
        return !validatorExists && submitTx;
      });

      await network.addValidatorOnP(
        wallet,
        amount,
        nodeId,
        startTime,
        endTime,
        delegationFee,
        validatorData.popBLSPublicKey,
        validatorData.popBLSSignature
      );

      network.setBeforeTxSignatureCallback(null);
      network.setBeforeTxSubmissionCallback(null);

      if (validatorExists) {
        t.skip(`Validator with node id ${nodeId} already exists`);
        return;
      } else if (!validatorExists && submitTx) {
        const validatorsAfter = await network.getValidatorsOnP();
        const validator = validatorsAfter.find((s) => s.nodeId === nodeId);
        assert.strictEqual(validator !== undefined, true);
        assert.strictEqual(validator.amount, amount);
        assert.strictEqual(validator.endTime, endTime);
        assert.strictEqual(validator.delegationFee, delegationFee);
        assert.strictEqual(validator.pAddress, network.getPAddress(publicKey));
      }
    });
  });
}
