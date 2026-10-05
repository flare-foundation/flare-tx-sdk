import { describe, it } from "node:test";
import assert from "node:assert";
import type { TestEnvironment } from "./env";
import { FdcSourceNetwork, type Network } from "../../src/network";

export function runFdcTests(env: TestEnvironment): void {
  const network = env.network;
  const wallet = env.getDigestWallet();

  describe("Attestation tests", () => {
    it("attestation for EVM transaction (SGB)", async (t) => {
      if (!["coston", "costwo"].includes(network.getHrp())) {
        t.skip("unsupported network");
        return;
      }

      const tx = await getSuitableTx("sgb");
      if (!tx) {
        t.skip("no EVM transaction found");
        return;
      }
      const txId = tx.hash;
      const request = await network.submitFdcAttestationRequestForEvmTransaction(wallet, FdcSourceNetwork.SGB, txId);
      assert.equal(request.votingRoundId > 0, true);

      await waitForFdcFinalization(network, env, request.votingRoundId);
      const attestation = await network.getFdcAttestation(request);
      assert.equal(tx.block_number, attestation.response.responseBody.blockNumber, "invalid block number");

      const verification = await network.verifyFdcAttestation(attestation);
      assert.equal(verification, true, "verification failed");
    });

    it("attestation for payment (DOGE)", async (t) => {
      if (!["coston", "costwo"].includes(network.getHrp())) {
        t.skip("unsupported network");
        return;
      }

      const tx = await getSuitableTx("doge");
      if (!tx) {
        t.skip("no payment transaction found");
        return;
      }
      const txId = tx.transactionId;
      const request = await network.submitFdcAttestationRequestForPayment(wallet, FdcSourceNetwork.DOGE, txId);

      await waitForFdcFinalization(network, env, request.votingRoundId);
      const attestation = await network.getFdcAttestation(request);
      assert.equal(tx.blockNumber, attestation.response.responseBody.blockNumber, "invalid block number");

      const verification = await network.verifyFdcAttestation(attestation);
      assert.equal(verification, true, "verification failed");
    });

    it("attestation for payment (XRP)", async (t) => {
      if (!["coston", "costwo"].includes(network.getHrp())) {
        t.skip("unsupported network");
        return;
      }

      const tx = await getSuitableTx("xrp");
      if (!tx) {
        t.skip("no payment transaction found");
        return;
      }
      const txId = tx.transactionId;
      const request = await network.submitFdcAttestationRequestForPayment(wallet, FdcSourceNetwork.XRP, txId);

      await waitForFdcFinalization(network, env, request.votingRoundId);
      const attestation = await network.getFdcAttestation(request);
      assert.equal(tx.blockNumber, attestation.response.responseBody.blockNumber, "invalid block number");

      const verification = await network.verifyFdcAttestation(attestation);
      assert.equal(verification, true, "verification failed");
    });

    it("attestation for address validity (DOGE)", async () => {
      const address = "nmZ36RoFkyd9tKqfTk2iBt5UfgLfbcxC98";
      const request = await network.submitFdcAttestationRequestForAddressValidity(
        wallet,
        FdcSourceNetwork.DOGE,
        address
      );

      await waitForFdcFinalization(network, env, request.votingRoundId);
      const attestation = await network.getFdcAttestation(request);
      assert.equal(attestation.response.responseBody.isValid, true, "invalid address");

      const verification = await network.verifyFdcAttestation(attestation);
      assert.equal(verification, true, "verification failed");
    });

    it("attestation for address validity (XRP)", async () => {
      const address = "rGBERS6aZcwaRjanAsao7n972v6wjYBkr1";
      const request = await network.submitFdcAttestationRequestForAddressValidity(
        wallet,
        FdcSourceNetwork.XRP,
        address
      );

      await waitForFdcFinalization(network, env, request.votingRoundId);
      const attestation = await network.getFdcAttestation(request);
      assert.equal(attestation.response.responseBody.isValid, true, "invalid address");

      const verification = await network.verifyFdcAttestation(attestation);
      assert.equal(verification, true, "verification failed");
    });

    it("attestation for Web2Json", async (_t) => {
      const url = "https://swapi.info/api/people/3";
      const httpMethod = "GET";
      const headers = "{}";
      const queryParams = "{}";
      const body = "{}";
      const postProcessJq = "{name: .name, height: .height, mass: .mass, numberOfFilms: .films | length}";
      const abiSignature =
        '{"components": [{"internalType": "string", "name": "name", "type": "string"},{"internalType": "uint256", "name": "height", "type": "uint256"},{"internalType": "uint256", "name": "mass", "type": "uint256"},{"internalType": "uint256", "name": "numberOfFilms", "type": "uint256"}], "name": "task", "type": "tuple"}';
      const request = await network.submitFdcAttestationRequestForWeb2Json(
        wallet,
        url,
        httpMethod,
        headers,
        queryParams,
        body,
        postProcessJq,
        abiSignature
      );
      assert.equal(request.votingRoundId > 0, true);

      await waitForFdcFinalization(network, env, request.votingRoundId);
      const attestation = await network.getFdcAttestation(request);
      assert.equal(url, attestation.response.requestBody.url, "invalid attestation");

      const verification = await network.verifyFdcAttestation(attestation);
      assert.equal(verification, true, "verification failed");
    });
  });
}

const FDC_FINALIZATION_TIMEOUT_MS = 300000;
const FDC_SKIP_MARGIN = 2;
const FDC_SKIP_LOOKAHEAD = 5;

async function waitForFdcFinalization(network: Network, env: TestEnvironment, votingRoundId: number): Promise<void> {
  const deadline = Date.now() + FDC_FINALIZATION_TIMEOUT_MS;
  while (true) {
    if (await network.isFdcVotingRoundFinalized(votingRoundId)) {
      return;
    }
    for (let ahead = FDC_SKIP_MARGIN; ahead <= FDC_SKIP_LOOKAHEAD; ahead++) {
      if (await network.isFdcVotingRoundFinalized(votingRoundId + ahead)) {
        throw new Error(
          `FDC voting round ${votingRoundId} was skipped (round ${votingRoundId + ahead} finalized first); request was not attested`
        );
      }
    }
    if (Date.now() >= deadline) {
      throw new Error(`FDC voting round ${votingRoundId} was not finalized within ${FDC_FINALIZATION_TIMEOUT_MS} ms`);
    }
    await env.sleep(3000);
  }
}

const INDEXER_BASE = "https://fdc-verifiers-testnet.flare.network";
const INDEXER_HEADERS = {
  "X-API-KEY": "00000000-0000-0000-0000-000000000000",
  "Content-Type": "application/json",
};

async function getSuitableTx(network: string): Promise<any> {
  if (["doge", "xrp"].includes(network)) {
    const indexer = `${INDEXER_BASE}/verifier/${network}/api/indexer`;
    const rangeResponse = await fetch(`${indexer}/block-range`, { method: "GET", headers: INDEXER_HEADERS });
    const last = Number((await rangeResponse.json()).data.last);
    const window = 100;
    const attempts = 100;
    for (let i = 0; i < attempts; i++) {
      const to = last - i * window;
      const from = to - window;
      const response = await fetch(`${indexer}/transaction?from=${from}&to=${to}&limit=100`, {
        method: "GET",
        headers: INDEXER_HEADERS,
      });
      const txs = (await response.json()).data.items;
      const payment = txs?.find((tx: any) => tx.isNativePayment);
      if (payment) {
        return payment;
      }
    }
    return null;
  } else if (network === "sgb") {
    const response = await fetch("https://coston-explorer.flare.network/api/v2/transactions", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const items = (await response.json()).items ?? [];
    // explorer returns newest first, pick one with a few confirmations.
    return items.find((tx: any) => Number(tx.confirmations) >= 5) ?? null;
  } else {
    throw new Error("Unsupported network");
  }
}
