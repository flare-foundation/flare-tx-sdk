import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Network } from "../src";
import { TestEnvironment } from "./env";
import { runBalanceTests } from "./balance";
import { runWNatTests } from "./wnat";
import { runTransferCTests } from "./transferc";
import { runFtsoDelegationTests } from "./delegateFtso";
import { runGenericContractTests } from "./genericc";
import { runTransferCPTests } from "./transfercp";
import { runDelegationPTests } from "./delegationp";

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

    const TEST_RECIPIENT1_C = "0x88622075eaC5ef1D2b08ffC8831547c8EaB1411b"
    const TEST_RECIPIENT2_C = "0x789FdAb73F7aFBb3e97638b039F8EBc0498690Ed"

    let env = new TestEnvironment(
        network,
        privateKey,
        TEST_RECIPIENT1_C,
        TEST_RECIPIENT2_C
    )

    runBalanceTests(env)
    runWNatTests(env)
    runTransferCTests(env)
    runFtsoDelegationTests(env)
    runGenericContractTests(env)
    runTransferCPTests(env)
    runDelegationPTests(env)
}

execute()