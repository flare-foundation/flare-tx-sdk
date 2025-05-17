import { Transaction } from "ethers";
import { EvmContract } from "./evm";

export class GenericRewardManager extends EvmContract {

    async getStateOfRewards(address: string): Promise<Array<bigint>> {
        let manager = this._getContract(["function getStateOfRewards(address _beneficiary) external view returns (uint256 _totalReward, uint256 _claimedReward)"])
        return manager.getStateOfRewards(address)
    }

    async claim(address: string, rewardOwner: string, recipient: string, rewardAmount: bigint, wrap: boolean): Promise<Transaction> {
        let manager = this._getContract(["function claim(address _rewardOwner, address payable _recipient, uint256 _rewardAmount, bool _wrap) external"])
        return this._getTx(address, BigInt(0), manager.claim, rewardOwner, recipient, rewardAmount, wrap)
    }

}