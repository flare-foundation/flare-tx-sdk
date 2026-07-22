import { describe, it } from "node:test";
import assert from "assert";
import { TestEnvironment } from "./env";
import { FdcSourceNetwork, Network } from "../../src/network";

export function runFdcTests(env: TestEnvironment): void {
    let network = env.network
    let wallet = env.getDigestWallet()

    describe("Attestation tests", function () {

        it("attestation for EVM transaction (SGB)", async function (t) {
            if (!["coston", "costwo"].includes(network.getHrp())) {
                t.skip("unsupported network")
                return
            }

            let tx = await getSuitableTx("sgb")
            if (!tx) {
                t.skip("no EVM transaction found")
                return
            }
            let txId = tx.hash
            let request = await network.submitFdcAttestationRequestForEvmTransaction(
                wallet,
                FdcSourceNetwork.SGB,
                txId
            )
            assert.equal(request.votingRoundId > 0, true)

            await waitForFdcFinalization(network, env, request.votingRoundId)
            let attestation = await network.getFdcAttestation(request)
            assert.equal(tx.block_number, attestation.response.responseBody.blockNumber, "invalid block number")

            let verification = await network.verifyFdcAttestation(attestation)
            assert.equal(verification, true, "verification failed")
        })

        it("attestation for payment (DOGE)", async function (t) {
            if (!["coston", "costwo"].includes(network.getHrp())) {
                t.skip("unsupported network")
                return
            }

            let tx = await getSuitableTx("doge")
            if (!tx) {
                t.skip("no payment transaction found")
                return
            }
            let txId = tx.transactionId
            let request = await network.submitFdcAttestationRequestForPayment(
                wallet,
                FdcSourceNetwork.DOGE,
                txId
            )

            await waitForFdcFinalization(network, env, request.votingRoundId)
            let attestation = await network.getFdcAttestation(request)
            assert.equal(tx.blockNumber, attestation.response.responseBody.blockNumber, "invalid block number")

            let verification = await network.verifyFdcAttestation(attestation)
            assert.equal(verification, true, "verification failed")
        })

        it("attestation for payment (XRP)", async function (t) {
            if (!["coston", "costwo"].includes(network.getHrp())) {
                t.skip("unsupported network")
                return
            }

            let tx = await getSuitableTx("xrp")
            if (!tx) {
                t.skip("no payment transaction found")
                return
            }
            let txId = tx.transactionId
            let request = await network.submitFdcAttestationRequestForPayment(
                wallet,
                FdcSourceNetwork.XRP,
                txId
            )

            await waitForFdcFinalization(network, env, request.votingRoundId)
            let attestation = await network.getFdcAttestation(request)
            assert.equal(tx.blockNumber, attestation.response.responseBody.blockNumber, "invalid block number")

            let verification = await network.verifyFdcAttestation(attestation)
            assert.equal(verification, true, "verification failed")
        })

        it("attestation for address validity (DOGE)", async function () {
            let address = "nmZ36RoFkyd9tKqfTk2iBt5UfgLfbcxC98"
            let request = await network.submitFdcAttestationRequestForAddressValidity(
                wallet,
                FdcSourceNetwork.DOGE,
                address
            )

            await waitForFdcFinalization(network, env, request.votingRoundId)
            let attestation = await network.getFdcAttestation(request)
            assert.equal(attestation.response.responseBody.isValid, true, "invalid address")

            let verification = await network.verifyFdcAttestation(attestation)
            assert.equal(verification, true, "verification failed")
        })

        it("attestation for address validity (XRP)", async function () {
            let address = "rGBERS6aZcwaRjanAsao7n972v6wjYBkr1"
            let request = await network.submitFdcAttestationRequestForAddressValidity(
                wallet,
                FdcSourceNetwork.XRP,
                address
            )

            await waitForFdcFinalization(network, env, request.votingRoundId)
            let attestation = await network.getFdcAttestation(request)
            assert.equal(attestation.response.responseBody.isValid, true, "invalid address")

            let verification = await network.verifyFdcAttestation(attestation)
            assert.equal(verification, true, "verification failed")
        })

        it("attestation for Web2Json", async function (t) {
            let url = "https://swapi.info/api/people/3"
            let httpMethod = "GET"
            let headers = "{}"
            let queryParams = "{}"
            let body = "{}"
            let postProcessJq = '{name: .name, height: .height, mass: .mass, numberOfFilms: .films | length}'
            let abiSignature = '{"components": [{"internalType": "string", "name": "name", "type": "string"},{"internalType": "uint256", "name": "height", "type": "uint256"},{"internalType": "uint256", "name": "mass", "type": "uint256"},{"internalType": "uint256", "name": "numberOfFilms", "type": "uint256"}], "name": "task", "type": "tuple"}'
            let request = await network.submitFdcAttestationRequestForWeb2Json(
                wallet,
                url,
                httpMethod,
                headers,
                queryParams,
                body,
                postProcessJq,
                abiSignature
            )
            assert.equal(request.votingRoundId > 0, true)

            await waitForFdcFinalization(network, env, request.votingRoundId)
            let attestation = await network.getFdcAttestation(request)
            assert.equal(url, attestation.response.requestBody.url, "invalid attestation")

            let verification = await network.verifyFdcAttestation(attestation)
            assert.equal(verification, true, "verification failed")
        })

    })

}

const FDC_FINALIZATION_TIMEOUT_MS = 300000
const FDC_SKIP_MARGIN = 2
const FDC_SKIP_LOOKAHEAD = 5

async function waitForFdcFinalization(
    network: Network,
    env: TestEnvironment,
    votingRoundId: number
): Promise<void> {
    let deadline = Date.now() + FDC_FINALIZATION_TIMEOUT_MS
    while (true) {
        if (await network.isFdcVotingRoundFinalized(votingRoundId)) {
            return
        }
        for (let ahead = FDC_SKIP_MARGIN; ahead <= FDC_SKIP_LOOKAHEAD; ahead++) {
            if (await network.isFdcVotingRoundFinalized(votingRoundId + ahead)) {
                throw new Error(`FDC voting round ${votingRoundId} was skipped (round ${votingRoundId + ahead} finalized first); request was not attested`)
            }
        }
        if (Date.now() >= deadline) {
            throw new Error(`FDC voting round ${votingRoundId} was not finalized within ${FDC_FINALIZATION_TIMEOUT_MS} ms`)
        }
        await env.sleep(3000)
    }
}

const INDEXER_BASE = "https://fdc-verifiers-testnet.flare.network"
const INDEXER_HEADERS = {
    "X-API-KEY": "00000000-0000-0000-0000-000000000000",
    "Content-Type": "application/json",
}

async function getSuitableTx(network: string): Promise<any> {
    if (["doge", "xrp"].includes(network)) {
        let indexer = `${INDEXER_BASE}/verifier/${network}/api/indexer`
        let rangeResponse = await fetch(`${indexer}/block-range`, { method: "GET", headers: INDEXER_HEADERS })
        let last = Number((await rangeResponse.json()).data.last)
        let window = 100
        let attempts = 100
        for (let i = 0; i < attempts; i++) {
            let to = last - i * window
            let from = to - window
            let response = await fetch(
                `${indexer}/transaction?from=${from}&to=${to}&limit=100`,
                { method: "GET", headers: INDEXER_HEADERS }
            )
            let txs = (await response.json()).data.items
            let payment = txs?.find((tx: any) => tx.isNativePayment)
            if (payment) {
                return payment
            }
        }
        return null
    } else if (network == "sgb") {
        let response = await fetch(
            "https://coston-explorer.flare.network/api/v2/transactions",
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                }
            }
        )
        let items = (await response.json()).items ?? []
        // explorer returns newest first, pick one with a few confirmations.
        return items.find((tx: any) => Number(tx.confirmations) >= 5) ?? null
    } else {
        throw new Error("Unsupported network")
    }
}