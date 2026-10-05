import { EvmContract } from "./evm_contract";

export class PChainStakeMirrorVerifier extends EvmContract {
  async minStakeAmount(): Promise<bigint> {
    const verifier = this._getContract(["function minStakeAmountGwei() public view returns (uint256)"]);
    const amount = await verifier.minStakeAmountGwei();
    return amount * BigInt(1e9);
  }

  async maxStakeAmount(): Promise<bigint> {
    const verifier = this._getContract(["function maxStakeAmountGwei() public view returns (uint256)"]);
    const amount = await verifier.maxStakeAmountGwei();
    return amount * BigInt(1e9);
  }

  async minStakeDurationSeconds(): Promise<bigint> {
    const verifier = this._getContract(["function minStakeDurationSeconds() public view returns (uint256)"]);
    return verifier.minStakeDurationSeconds();
  }

  async maxStakeDurationSeconds(): Promise<bigint> {
    const verifier = this._getContract(["function maxStakeDurationSeconds() public view returns (uint256)"]);
    return verifier.maxStakeDurationSeconds();
  }
}
