import { RNatAccountBalance, RNatProject, RNatProjectInfo } from "src/network/iotype";
import { EvmContract } from "./evm_contract";

export class RNat extends EvmContract {

    async getProjectsBasicInfo(): Promise<Array<RNatProject>> {
        let rnat = this._getContract(["function getProjectsBasicInfo() external view returns (string[] memory _names, bool[] memory _claimingDisabled)"])
        let result = (await rnat.getProjectsBasicInfo()) as Array<any>
        return result[0].map((_: any, i: number) => <RNatProject>{ id: i, name: result[0][i], claimingDisabled: result[1][i] })
    }

    async getProjectInfo(projectId: number): Promise<RNatProjectInfo> {
        let rnat = this._getContract(["function getProjectInfo(uint256 _projectId) external view returns (string memory _name, address _distributor, bool _currentMonthDistributionEnabled, bool _distributionDisabled, bool _claimingDisabled, uint128 _totalAssignedRewards, uint128 _totalDistributedRewards, uint128 _totalClaimedRewards, uint128 _totalUnassignedUnclaimedRewards, uint256[] memory _monthsWithRewards)"])
        let result = await rnat.getProjectInfo(projectId)
        return {
            name: result[0],
            distributor: result[1],
            currentMonthDistributionEnabled: result[2],
            distributionDisabled: result[3],
            claimingDisabled: result[4],
            totalAssignedRewards: result[5],
            totalDistributedRewards: result[6],
            totalClaimedRewards: result[7],
            totalUnassignedUnclaimedRewards: result[8],
            monthsWithRewards: result[9].map((m: bigint) => m)
        }
    }

    async getClaimableRewards(projectId: number, owner: string): Promise<bigint> {
        let rnat = this._getContract(["function getClaimableRewards(uint256 _projectId, address _owner) external view returns (uint128)"])
        return rnat.getClaimableRewards(projectId, owner)
    }

    async getBalancesOf(owner: string): Promise<RNatAccountBalance> {
        let rnat = this._getContract(["function getBalancesOf(address _owner) external view returns (uint256 _wNatBalance, uint256 _rNatBalance, uint256 _lockedBalance)"])
        let result = await rnat.getBalancesOf(owner)
        return {
            wNatBalance: result[0],
            rNatBalance: result[1],
            lockedBalance: result[2]
        }
    }

    async getRNatAccount(owner: string): Promise<string> {
        let rnat = this._getContract(["function getRNatAccount(address _owner) external view returns (address)"])
        return rnat.getRNatAccount(owner)
    }

    async getCurrentMonth(): Promise<bigint> {
        let rnat = this._getContract(["function getCurrentMonth() external view returns (uint256)"])
        return rnat.getCurrentMonth()
    }

    claimRewards(projectIds: Array<number>, month: bigint): string {
        let rnat = this._getContract(["function claimRewards(uint256[] calldata _projectIds, uint256 _month) external returns (uint128 _claimedRewardsWei)"])
        return this._getData(rnat, rnat.claimRewards, projectIds, month)
    }

    withdraw(amount: bigint, wrap: boolean): string {
        let rnat = this._getContract(["function withdraw(uint128 _amount, bool _wrap) external"])
        return this._getData(rnat, rnat.withdraw, amount, wrap)
    }

    withdrawAll(wrap: boolean): string {
        let rnat = this._getContract(["function withdrawAll(bool _wrap) external"])
        return this._getData(rnat, rnat.withdrawAll, wrap)
    }

}