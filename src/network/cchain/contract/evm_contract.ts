import { BaseContractMethod, Contract, Interface, InterfaceAbi } from "ethers";
import { NetworkCore, NetworkBased } from "../../core";

export abstract class EvmContract extends NetworkBased {

    constructor(network: NetworkCore, address: string) {
        super(network)
        this.address = address
    }

    public address: string

    protected _getContract(abi: InterfaceAbi): Contract {
        return new Contract(this.address, new Interface(abi), this._core.ethers)
    }

    protected _getData(contract: Contract, method: BaseContractMethod, ...params: any[]): string {
        return contract.interface.encodeFunctionData(method.fragment, params)
    }

}