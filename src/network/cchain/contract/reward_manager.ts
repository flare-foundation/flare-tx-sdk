import { EvmContract } from "./evm_contract";
import type { FtsoRewardClaimWithProof, FtsoRewardState } from "../../iotype";

export class RewardManager extends EvmContract {
  async getStateOfRewards(address: string): Promise<Array<Array<FtsoRewardState>>> {
    const manager = this._getContract([
      "function getStateOfRewards(address _rewardOwner) external view returns (tuple(uint24 rewardEpochId, bytes20 beneficiary, uint120 amount, uint8 claimType, bool initialised)[][] memory _rewardStates)",
    ]);
    const results = await manager.getStateOfRewards(address);
    const states: Array<FtsoRewardState>[] = [];
    for (const epochResults of results) {
      const epochStates: FtsoRewardState[] = [];
      for (const result of epochResults) {
        epochStates.push({
          rewardEpochId: result.rewardEpochId,
          beneficiary: result.beneficiary,
          amount: result.amount,
          claimType: Number(result.claimType),
          initialised: result.initialised,
        });
      }
      states.push(epochStates);
    }
    return states;
  }

  claim(
    rewardOwner: string,
    recipient: string,
    rewardEpochId: bigint,
    wrap: boolean,
    proofs: Array<FtsoRewardClaimWithProof>
  ): string {
    const manager = this._getContract([
      "function claim(address _rewardOwner, address payable _recipient, uint24 _rewardEpochId, bool _wrap, tuple(bytes32[] merkleProof, tuple(uint24 rewardEpochId, bytes20 beneficiary, uint120 amount, uint8 claimType) body)[] calldata _proofs) external returns (uint256 _rewardAmountWei)",
    ]);
    return this._getData(manager, manager.claim, rewardOwner, recipient, rewardEpochId, wrap, proofs);
  }
}
