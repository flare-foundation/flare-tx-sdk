import { FoundationProposalInfo, FoundationProposalState, FoundationProposalSupport } from "src/network/iotype";
import { EvmContract } from "./evm_contract";

export class PollingFoundation extends EvmContract {

    async getProposalIds(): Promise<Array<bigint>> {
        let polling = this._getContract(["function getProposalIds() external view returns (uint256[] memory)"])
        let result = (await polling.getProposalIds()) as Array<any>
        return result.map(i => i)
    }

    async getProposalInfo(proposalId: bigint): Promise<FoundationProposalInfo> {
        let polling = this._getContract(["function getProposalInfo(uint256 _proposalId) external view returns (address _proposer, bool _accept, uint256 _votePowerBlock, uint256 _voteStartTime, uint256 _voteEndTime, uint256 _execStartTime, uint256 _execEndTime, uint256 _thresholdConditionBIPS, uint256 _majorityConditionBIPS, uint256 _circulatingSupply, string memory _description)"])
        let info = await polling.getProposalInfo(proposalId)
        return {
            proposer: info[0],
            accept: info[1],
            votePowerBlock: info[2],
            voteStartTime: info[3],
            voteEndTime: info[4],
            thresholdConditionBP: info[7],
            majorityConditionBP: info[8],
            circulatingSupply: info[9],
            description: info[10],
            state: undefined,
            votePowerFor: BigInt(0),
            votePowerAgainst: BigInt(0)
        }
    }

    async getProposalState(proposalId: bigint): Promise<FoundationProposalState> {
        let polling = this._getContract(["function state(uint256 _proposalId) external view returns (uint8)"])
        return Number(await polling.state(proposalId))
    }

    async getProposalVotes(proposalId: bigint): Promise<[bigint, bigint]> {
        let polling = this._getContract(["function getProposalVotes(uint256 _proposalId) external view returns (uint256 _for, uint256 _against)"])
        let result = await polling.getProposalVotes(proposalId)
        return [result[0], result[1]]
    }

    async getVotes(voter: string, blockNumber: bigint): Promise<bigint> {
        let polling = this._getContract(["function getVotes(address _voter, uint256 _blockNumber) external view returns (uint256)"])
        return polling.getVotes(voter, blockNumber)
    }

    async hasVoted(proposalId: bigint, voter: string): Promise<boolean> {
        let polling = this._getContract(["function hasVoted(uint256 _proposalId, address _voter) external view returns (bool)"])
        return polling.hasVoted(proposalId, voter)
    }

    castVote(proposalId: bigint, support: FoundationProposalSupport): string {
        let polling = this._getContract(["function castVote(uint256 _proposalId, uint8 _support) external returns (uint256)"])
        return this._getData(polling, polling.castVote, proposalId, support)
    }

}