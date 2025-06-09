import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Network } from "../../src";
import { TestEnvironment } from "./env";
import { runBalanceTests } from "./balance";
import { runWNatTests } from "./wnat";
import { runTransferCTests } from "./transferc";
import { runFtsoDelegationTests } from "./delegateFtso";
import { runGenericContractTests } from "./genericc";
import { runTransferCPTests } from "./transfercp";
import { runDelegationPTests } from "./delegationp";
import { runFlareDropClaimTests } from "./claimFlaredrop";
import { runStakingClaimTests } from "./claimStaking";
import { runFtsoClaimTests } from "./claimFtso";
import { runSmartAccountTests } from "./smartAccount";

function execute() {
    const TEST_KEY_FILE = path.join("test", "keys", "key.txt")
    let privateKey: string
    if (process.argv.length > 2) {
        privateKey = process.argv[2]
    } else if (existsSync(TEST_KEY_FILE)) {
        privateKey = readFileSync(TEST_KEY_FILE).toString()
    } else {
        console.info("To execute tests provide the private key of a test account.")
        console.info("Option 1: npm run test {private_key}")
        console.info(`Option 2: add ${TEST_KEY_FILE} that contains the private key`)
        return
    }

    let network = Network.COSTON2

    const TEST_RECIPIENT1_PUBKEY = "0x04d6720471d6a8fa0bb191a946f668dddf09605ffca423de2a9f8111b63f2fbc5aa803146b925ae1b69042ee601abcb262774330abfa45720ef80c6cbcb47e58f7"
    const TEST_RECIPIENT1_C = network.getCAddress(TEST_RECIPIENT1_PUBKEY)
    const TEST_RECIPIENT1_P = network.getPAddress(TEST_RECIPIENT1_PUBKEY)
    const TEST_RECIPIENT2_C = "0x789FdAb73F7aFBb3e97638b039F8EBc0498690Ed"

    let env = new TestEnvironment(
        network,
        privateKey,
        TEST_RECIPIENT1_C,
        TEST_RECIPIENT1_P,
        TEST_RECIPIENT2_C,
    )

    runBalanceTests(env)
    runWNatTests(env)
    runTransferCTests(env)
    runFlareDropClaimTests(env)
    runStakingClaimTests(env)
    runFtsoClaimTests(env)
    runFtsoDelegationTests(env)
    runSmartAccountTests(env)
    runGenericContractTests(env)
    runTransferCPTests(env)
    runDelegationPTests(env)
}

execute()