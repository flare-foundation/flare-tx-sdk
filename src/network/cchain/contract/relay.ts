import { EvmContract } from "./evm_contract";

export class Relay extends EvmContract {

    async isFinalized(protocolId: number, votingRoundId: number): Promise<boolean> {
        let relay = this._getContract(["function isFinalized(uint256 _protocolId, uint256 _votingRoundId) external view returns (bool)"])
        return relay.isFinalized(protocolId, votingRoundId)
    }

}

