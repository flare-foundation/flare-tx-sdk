import { EvmContract } from "./evm_contract";
import { FtsoRewardClaimWithProof, FtsoRewardState } from "../../iotype";

export class RewardManager extends EvmContract {

    async getStateOfRewards(address: string): Promise<Array<Array<FtsoRewardState>>> {
        let manager = this._getContract(["function getStateOfRewards(address _rewardOwner) external view returns (tuple(uint24 rewardEpochId, bytes20 beneficiary, uint120 amount, uint8 claimType, bool initialised)[][] memory _rewardStates)"])
        let results = await manager.getStateOfRewards(address)
        let states = new Array<Array<FtsoRewardState>>
        for (let epochResults of results) {
            let epochStates = new Array<FtsoRewardState>()
            for (let result of epochResults) {
                epochStates.push({
                    rewardEpochId: result.rewardEpochId,
                    beneficiary: result.beneficiary,
                    amount: result.amount,
                    claimType: Number(result.claimType),
                    initialised: result.initialised
                })
            }
            states.push(epochStates)            
        }
        return states
    }

    claim(rewardOwner: string, recipient: string, rewardEpochId: bigint, wrap: boolean, proofs: Array<FtsoRewardClaimWithProof>): string {
        let manager = this._getContract(["function claim(address _rewardOwner, address payable _recipient, uint24 _rewardEpochId, bool _wrap, tuple(bytes32[] merkleProof, tuple(uint24 rewardEpochId, bytes20 beneficiary, uint120 amount, uint8 claimType) body)[] calldata _proofs) external returns (uint256 _rewardAmountWei)"])
        return this._getData(manager, manager.claim, rewardOwner, recipient, rewardEpochId, wrap, proofs)
    }

}