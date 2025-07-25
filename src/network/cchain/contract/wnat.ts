import { FtsoDelegate as FtsoDelegate } from "src/network/iotype";
import { EvmContract } from "./evm_contract";

export class WNat extends EvmContract {

    async balanceOf(address: string): Promise<bigint> {
        let wnat = this._getContract(["function balanceOf(address account) external view returns (uint256)"])
        return wnat.balanceOf(address)
    }

    async delegatesOf(address: string): Promise<Array<FtsoDelegate>> {
        let wnat = this._getContract(["function delegatesOf(address _owner) external view returns (address[] memory _delegateAddresses, uint256[] memory _bips, uint256 _count, uint256 _delegationMode)"])
        let result = (await wnat.delegatesOf(address)) as Array<any[]>
        return result[0].map((_, i) => <FtsoDelegate>{ address: result[0][i], shareBP: result[1][i] })
    }

    transfer(recipient: string, amount: bigint): string {
        let wnat = this._getContract(["function transfer(address recipient, uint256 amount) public returns (bool)"])
        return this._getData(wnat, wnat.transfer, recipient, amount)
    }

    wrap(): string {
        let wnat = this._getContract(["function deposit() public payable"])
        return this._getData(wnat, wnat.deposit)
    }

    withdraw(amount: bigint): string {
        let wnat = this._getContract(["function withdraw(uint256 amount) external"])
        return this._getData(wnat, wnat.withdraw, amount)
    }

    batchDelegate(delegates: Array<string>, sharesBP: Array<bigint>): string {
        let wnat = this._getContract(["function batchDelegate(address[] memory _delegatees, uint256[] memory _bips) external"])
        return this._getData(wnat, wnat.batchDelegate, delegates, sharesBP)
    }

    delegate(delegate: string, shareBP: bigint): string {
        let wnat = this._getContract(["function delegate(address _to, uint256 _bips) external"])
        return this._getData(wnat, wnat.delegate, delegate, shareBP)
    }

    undelegateAll(): string {
        let wnat = this._getContract(["function undelegateAll() external"])
        return this._getData(wnat, wnat.undelegateAll)
    }

}