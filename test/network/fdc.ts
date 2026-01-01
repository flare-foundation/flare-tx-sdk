import { describe, it } from "node:test";
import assert from "assert";
import { TestEnvironment } from "./env";
import { FdcSourceNetwork } from "../../src/network";

export function runFdcTests(env: TestEnvironment): void {
    let network = env.network
    let wallet = env.getDigestWallet()

    describe("Attestation tests", function () {

        it("attestation for EVM transaction (ETH test)", async function () {
            let txId = "0x8e7e4da9eb87b22e3eb7f06e7886f3dfe0d94e6a70f3b912ed37b3523e1e1dd6"
            let request = await network.submitFdcAttestationRequestForEvmTransaction(
                wallet,
                FdcSourceNetwork.ETH_TEST,
                txId
            )
            while (!(await network.isFdcVotingRoundFinalized(request.votingRoundId))) {
                await env.sleep(3000)
            }
            let attestation = await network.getFdcAttestation(request)
            console.log(attestation)
        })

        it("attestation for payment (BTC test)", async function () {
            let txId = "d7bc29e1415dcd84cad09a0528973065cd6f1182800270814e197c22a3a7b155"
            let request = await network.submitFdcAttestationRequestForPayment(
                wallet,
                FdcSourceNetwork.BTC_TEST,
                txId
            )
            while (!(await network.isFdcVotingRoundFinalized(request.votingRoundId))) {
                await env.sleep(3000)
            }
            let attestation = await network.getFdcAttestation(request)
            console.log(attestation)
        })

        it("attestation for payment (XRP test)", async function () {
            let txId = "61B3F82572EB36BED16C14470D8F6E10E877AAF41D82E0A990F2385C40F445C6"
            let request = await network.submitFdcAttestationRequestForPayment(
                wallet,
                FdcSourceNetwork.XRP_TEST,
                txId
            )
            while (!(await network.isFdcVotingRoundFinalized(request.votingRoundId))) {
                await env.sleep(3000)
            }
            let attestation = await network.getFdcAttestation(request)
            console.log(attestation)
        })

        it("attestation for address validity (BTC test)", async function () {
            let address = "tb1qsdxygae5zfrnhdpsjrlsev9zw40dx88z72vrkx"
            let request = await network.submitFdcAttestationRequestForAddressValidity(
                wallet,
                FdcSourceNetwork.BTC_TEST,
                address
            )
            while (!(await network.isFdcVotingRoundFinalized(request.votingRoundId))) {
                await env.sleep(3000)
            }
            let attestation = await network.getFdcAttestation(request)
            console.log(attestation)
        })

        it("attestation for address validity (XRP test)", async function () {
            let address = "rGBERS6aZcwaRjanAsao7n972v6wjYBkr1"
            let request = await network.submitFdcAttestationRequestForAddressValidity(
                wallet,
                FdcSourceNetwork.XRP_TEST,
                address
            )
            while (!(await network.isFdcVotingRoundFinalized(request.votingRoundId))) {
                await env.sleep(3000)
            }
            let attestation = await network.getFdcAttestation(request)
            console.log(attestation)
        })

    })

}