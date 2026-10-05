import { EvmContract } from "./evm_contract";

export class FdcRequestFeeConfigurations extends EvmContract {
  async getRequestFee(data: string): Promise<bigint> {
    const conf = this._getContract(["function getRequestFee(bytes calldata data) external view returns (uint256 fee)"]);
    return conf.getRequestFee(data);
  }
}
