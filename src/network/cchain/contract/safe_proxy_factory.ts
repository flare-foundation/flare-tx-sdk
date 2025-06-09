import { Transaction } from "ethers";
import { EvmContract } from "./evm";
import { GnosisSafeProxy as SafeProxy } from "./safe_proxy";

export class SafeProxyFactory extends EvmContract {

    async getCreatProxyTx(address: string, singletonAddress: string, owners: Array<string>, threshold: bigint, fallbackHandler: string, saltNonce: bigint): Promise<Transaction> {
        let wnat = this._getContract(["function createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce) public"])
        let singleton = new SafeProxy(this._core, singletonAddress)
        let initializer = singleton.getSetupData(owners, threshold, fallbackHandler)
        return this._getTx(address, BigInt(0), wnat.createProxyWithNonce, singletonAddress, initializer, saltNonce)
    }

}