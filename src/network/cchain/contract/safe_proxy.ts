import { ethers } from "ethers";
import { EvmContract } from "./evm";

export class GnosisSafeProxy extends EvmContract {

    async getOwners(): Promise<Array<string>> {
        let proxy = this._getContract(["function getOwners() public view returns (address[] memory)"])
        let result = await proxy.getOwners() as Array<any>
        return result.map(a => a)
    }

    async getThreshold(): Promise<bigint> {
        let proxy = this._getContract(["function getThreshold() public view returns (uint256)"])
        return proxy.getThreshold()
    }

    async getSetupData(owners: Array<string>, threshold: bigint, fallbackHandler: string): Promise<string> {
        let singleton = this._getContract(["function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver) external"])
        return this._getData(singleton, singleton.setup, owners, threshold, ethers.ZeroAddress, "0x", fallbackHandler, ethers.ZeroAddress, BigInt(0), ethers.ZeroAddress)
    }

}