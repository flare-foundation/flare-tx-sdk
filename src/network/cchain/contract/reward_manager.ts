import { Transaction } from "ethers";
import { EvmContract } from "./evm";
import { FtsoRewardClaimWithProof, FtsoRewardState } from "src/network/iotype";

export class RewardManager extends EvmContract {

    async getStateOfRewards(address: string): Promise<Array<Array<FtsoRewardState>>> {
        let manager = this._getContract(["function getStateOfRewards(address _rewardOwner) external view returns (tuple(uint24 rewardEpochId, bytes20 beneficiary, uint120 amount, uint8 claimType, bool initialised)[] memory _rewardStates)"])
        return manager.getStateOfRewards(address)
    }

    async claim(address: string, rewardOwner: string, recipient: string, rewardEpochId: bigint, wrap: boolean, proofs: Array<FtsoRewardClaimWithProof>): Promise<Transaction> {
        let manager = this._getContract(["function claim(address _rewardOwner, address payable _recipient, uint24 _rewardEpochId, bool _wrap, tuple(bytes32[] merkleProof, tuple(uint24 rewardEpochId, bytes20 beneficiary, uint120 amount, uint8 claimType))[][] calldata _proofs) external returns (uint256 _rewardAmountWei)"])
        return this._getTx(address, BigInt(0), manager.claim, rewardOwner, recipient, rewardEpochId, wrap, proofs)
    }

}