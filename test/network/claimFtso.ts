import { describe, it } from "node:test";
import assert from "node:assert";
import type { TestEnvironment } from "./env";

export function runFtsoClaimTests(env: TestEnvironment): void {
  describe("FTSO claim tests", () => {
    const network = env.network;
    const wallets = env.getEvmWallets();

    for (const wallet of wallets) {
      describe(wallet.getDescription(), async () => {
        it("get state of rewards", async () => {
          const publicKey = await wallet.getPublicKey();
          await network.getStateOfFtsoRewards(publicKey);
        });

        it("get claimable amount", async () => {
          const publicKey = await wallet.getPublicKey();
          await network.getClaimableFtsoReward(publicKey);
        });

        it("claim reward", async (t) => {
          const publicKey = await wallet.getPublicKey();

          const reward = await network.getClaimableFtsoReward(publicKey);
          if (reward === BigInt(0)) {
            const states = await network.getStateOfFtsoRewards(publicKey);
            let canClaim = false;
            for (const epochStates of states) {
              if (epochStates.length === 0) {
                continue;
              }
              canClaim = epochStates.every((s) => s.initialised);
              break;
            }
            if (!canClaim) {
              t.skip("No reward epochs with initialised rewards");
              return;
            }
          }

          const recipient = env.getCAddress(1);
          const wrap = Math.random() < 0.5;
          const startBalance = wrap
            ? await network.getBalanceWrappedOnC(recipient)
            : await network.getBalanceOnC(recipient);

          await network.claimFtsoReward(wallet, null, recipient, wrap);
          const endBalance = wrap
            ? await network.getBalanceWrappedOnC(recipient)
            : await network.getBalanceOnC(recipient);
          assert.strictEqual(
            endBalance,
            startBalance + reward,
            `invalid${wrap ? " wrapped" : ""} balance after reward claiming`
          );
        });

        /*
                it("claim reward with proofs", async function () {
                    let proofs = new Array<FtsoRewardClaimWithProof>()
                    proofs.push({
                            merkleProof: [
                                ],
                            body: {
                                beneficiary: "",
                                claimType: 1,
                                amount: BigInt(0),
                                rewardEpochId: BigInt(0)
                            }
                        })
                    let reward = proofs.reduce((v, s) => { return v + s.body.amount }, BigInt(0))

                    let recipient = env.address1
                    let wrap = Math.random() < 0.5
                    let startBalance = wrap ? await network.getBalanceWrappedOnC(recipient) : await network.getBalanceOnC(recipient)

                    await network.claimFtsoReward(wallet, null, recipient, wrap, proofs)
                    let endBalance = wrap ? await network.getBalanceWrappedOnC(recipient) : await network.getBalanceOnC(recipient)
                    assert.strictEqual(endBalance, startBalance + reward, `invalid${wrap ? " wrapped" : ""} balance after reward claiming`)
                })
                */
      });
    }
  });
}
