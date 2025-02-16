import { Transaction } from "ethers";
import { EvmContract } from "./evm";

export class GenericContract extends EvmContract {

    async call(abi: string, method: string, ...params: any[]): Promise<any> {
        let contract = this._getContract(abi)
        return contract[method](...params)
    }

    async getTx(
        address: string, abi: string, method: string, value: bigint, ...params: any[]
    ): Promise<Transaction> {
        let contract = this._getContract(abi)
        return this._getTx(address, value, contract[method], ...params)
    }

}