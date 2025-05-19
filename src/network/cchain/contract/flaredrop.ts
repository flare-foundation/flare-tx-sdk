import { Transaction } from "ethers";
import { EvmContract } from "./evm";

export class DistributionToDelegators extends EvmContract {

    async getCurrentMonth(): Promise<bigint> {
        let distribution = this._getContract(["function getCurrentMonth() public view returns (uint256 _currentMonth)"])
        return distribution.getCurrentMonth()
    }

    async getClaimableMonths(): Promise<Array<bigint>> {
        let distribution = this._getContract(["function getClaimableMonths() external view returns(uint256 _startMonth, uint256 _endMonth)"])
        return distribution.getClaimableMonths()
    }

    async nextClaimableMonth(address: string): Promise<bigint> {
        let distribution = this._getContract(["function nextClaimableMonth(address _rewardOwner) external view returns (uint256)"])
        return distribution.nextClaimableMonth(address)
    }

    async getClaimableAmountOf(address: string, month: bigint): Promise<bigint> {
        let distribution = this._getContract(["function getClaimableAmountOf(address _account, uint256 _month) external view returns (uint256 _amountWei)"])
        return distribution.getClaimableAmountOf(address, month)
    }

    async claim(address: string, rewardOwner: string, recipient: string, month: bigint, wrap: boolean): Promise<Transaction> {
        let distribution = this._getContract(["function claim(address _rewardOwner, address _recipient, uint256 _month, bool _wrap) external returns (uint256 _rewardAmount)"])
        return this._getTx(address, BigInt(0), distribution.claim, rewardOwner, recipient, month, wrap)
    }

}