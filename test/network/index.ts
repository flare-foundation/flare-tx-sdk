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
import { runRNatTests } from "./rnat";
import { runPollingTests } from "./polling";

function execute() {
    const TEST_KEYS_FILE = path.join("test", "keys", "keys.txt")
    let privateKeys: string
    if (process.argv.length > 2) {
        privateKeys = process.argv[2]
    } else if (existsSync(TEST_KEYS_FILE)) {
        privateKeys = readFileSync(TEST_KEYS_FILE).toString()
    } else {
        console.info("To execute tests provide three private keys for test accounts.")
        console.info("Option 1: npm run test {comma,separated,private_keys}")
        console.info(`Option 2: add file ${TEST_KEYS_FILE} that contains a comma separated list of private keys`)
        return
    }

    let env = new TestEnvironment(
        Network.COSTON2,
        privateKeys.split(",")
    )

    runBalanceTests(env)
    runWNatTests(env)
    runTransferCTests(env)
    runFlareDropClaimTests(env)
    runStakingClaimTests(env)
    runFtsoClaimTests(env)
    runFtsoDelegationTests(env)
    runRNatTests(env)
    runSmartAccountTests(env)
    runPollingTests(env)
    runGenericContractTests(env)
    runTransferCPTests(env)
    runDelegationPTests(env)
}

execute()