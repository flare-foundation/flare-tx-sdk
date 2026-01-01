import { EvmContract } from "./evm_contract";

export class FlareSystemsManager extends EvmContract {

    async firstVotingRoundStartTs(): Promise<bigint> {
        let verifier = this._getContract(["function firstVotingRoundStartTs() public view returns (uint256)"])
        return verifier.firstVotingRoundStartTs()
    }

    async votingEpochDurationSeconds(): Promise<bigint> {
        let verifier = this._getContract(["function votingEpochDurationSeconds() public view returns (uint256)"])
        return verifier.votingEpochDurationSeconds()
    }

}