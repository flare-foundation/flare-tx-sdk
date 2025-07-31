import { EvmContract } from "./evm_contract";
import { SafeProxy as SafeProxy } from "./safe_proxy";

export class SafeProxyFactory extends EvmContract {

    createProxy(singletonAddress: string, owners: Array<string>, threshold: bigint, fallbackHandler: string, saltNonce: bigint): string {
        let factory = this._getContract(["function createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce) public"])
        let singleton = new SafeProxy(this._core, singletonAddress)
        let initializer = singleton.setup(owners, threshold, fallbackHandler)
        return this._getData(factory, factory.createProxyWithNonce, singletonAddress, initializer, saltNonce)
    }

}