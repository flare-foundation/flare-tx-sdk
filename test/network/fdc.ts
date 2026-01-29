import { describe, it } from "node:test";
import assert from "assert";
import { TestEnvironment } from "./env";
import { FdcSourceNetwork } from "../../src/network";

export function runFdcTests(env: TestEnvironment): void {
    let network = env.network
    let wallet = env.getDigestWallet()

    describe("Attestation tests", function () {

        it("attestation for EVM transaction (SGB)", async function (t) {
            if (!["coston", "costwo"].includes(network.getHrp())) {
                t.skip("unsupported network")
                return
            }

            let tx = await getRecentTx("sgb")
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

            while (!(await network.isFdcVotingRoundFinalized(request.votingRoundId))) {
                await env.sleep(3000)
            }
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

            let tx = await getRecentTx("doge")
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

            return
            while (!(await network.isFdcVotingRoundFinalized(request.votingRoundId))) {
                await env.sleep(3000)
            }
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

            let tx = await getRecentTx("xrp")
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

            while (!(await network.isFdcVotingRoundFinalized(request.votingRoundId))) {
                await env.sleep(3000)
            }
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

            while (!(await network.isFdcVotingRoundFinalized(request.votingRoundId))) {
                await env.sleep(3000)
            }
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

            while (!(await network.isFdcVotingRoundFinalized(request.votingRoundId))) {
                await env.sleep(3000)
            }
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
            return

            while (!(await network.isFdcVotingRoundFinalized(request.votingRoundId))) {
                await env.sleep(3000)
            }
            let attestation = await network.getFdcAttestation(request)
            console.log(attestation)

            let verification = await network.verifyFdcAttestation(attestation)
            assert.equal(verification, true, "verification failed")
        })

    })

}

async function getRecentTx(network: string): Promise<any> {
    if (["doge", "xrp"].includes(network)) {
        let limit = 100
        let attempts = 100
        for (let i = 0; i < attempts; i++) {
            let response = await fetch(
                `https://fdc-verifiers-testnet.flare.network/verifier/${network}/api/indexer/transaction?limit=${limit}&offset=${i * limit}`,
                {
                    method: "GET",
                    headers: {
                        "X-API-KEY": "00000000-0000-0000-0000-000000000000",
                        "Content-Type": "application/json",
                    }
                }
            )
            let json = await response.json()
            let txs = json.data.items
            let payment = txs.find((tx: any) => tx.isNativePayment)
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
        let json = await response.json()
        return json.items && json.items.length > 0 ? json.items[0] : null
    } else {
        throw new Error("Unsupported network")
    }
}