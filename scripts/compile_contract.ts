import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import solc from "solc";

// Compiler settings used for contracts whose bytecode is embedded in the SDK.
const EVM_VERSION = "paris";
const OPTIMIZER_RUNS = 200;

function execute() {
  const file = process.argv[2];
  if (!file || !existsSync(file)) {
    console.info("Provide a path to a Solidity file, e.g. misc/contracts/RNatProjectsReader.sol");
    return;
  }

  const name = path.basename(file);
  const input = {
    language: "Solidity",
    sources: { [name]: { content: readFileSync(file).toString() } },
    settings: {
      optimizer: { enabled: true, runs: OPTIMIZER_RUNS },
      evmVersion: EVM_VERSION,
      outputSelection: { "*": { "*": ["evm.bytecode.object"] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  const errors = (output.errors ?? []).filter((e: any) => e.severity === "error");
  for (const e of output.errors ?? []) {
    console.error(e.formattedMessage);
  }
  if (errors.length > 0) {
    return;
  }

  console.log(`Compiler: solc ${solc.version()}, optimizer ${OPTIMIZER_RUNS} runs, EVM version ${EVM_VERSION}`);
  for (const [contract, result] of Object.entries<any>(output.contracts[name])) {
    const bytecode = result.evm.bytecode.object;
    if (bytecode.length > 0) {
      console.log(`${contract}: 0x${bytecode}`);
    }
  }
}

execute();
