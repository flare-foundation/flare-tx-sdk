import { EvmContract } from "./evm_contract";

export class GenericRewardManager extends EvmContract {

    async getStateOfRewards(address: string): Promise<Array<bigint>> {
        let manager = this._getContract(["function getStateOfRewards(address _beneficiary) external view returns (uint256 _totalReward, uint256 _claimedReward)"])
        return manager.getStateOfRewards(address)
    }

    claim(rewardOwner: string, recipient: string, rewardAmount: bigint, wrap: boolean): string {
        let manager = this._getContract(["function claim(address _rewardOwner, address payable _recipient, uint256 _rewardAmount, bool _wrap) external"])
        return this._getData(manager, manager.claim, rewardOwner, recipient, rewardAmount, wrap)
    }

}