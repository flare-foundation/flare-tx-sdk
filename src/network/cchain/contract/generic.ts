import { EvmContract } from "./evm_contract";

export class GenericContract extends EvmContract {

    async call(abi: string, method: string, ...params: any[]): Promise<any> {
        let contract = this._getContract(abi)
        return contract[method](...params)
    }

    getData(abi: string, method: string, ...params: any[]): string {
        let contract = this._getContract(abi)
        return this._getData(contract, contract[method], ...params)
    }

}