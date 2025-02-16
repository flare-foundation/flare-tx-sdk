import { FtsoDelegate as FtsoDelegate } from "src/network/balance";
import { EvmContract } from "./evm";
import { checkResultErrors, Transaction } from "ethers";

export class WNat extends EvmContract {

    async balanceOf(address: string): Promise<bigint> {
        let wnat = this._getContract(["function balanceOf(address account) external view returns (uint256)"])
        return wnat.balanceOf(address)
    }

    async delegatesOf(address: string): Promise<Array<FtsoDelegate>> {
        let wnat = this._getContract(["function delegatesOf(address _owner) external view returns (address[] memory _delegateAddresses, uint256[] memory _bips, uint256 _count, uint256 _delegationMode)"])
        let result = await wnat.delegatesOf(address) as Array<any[]>
        return result[0].map((_, i) => <FtsoDelegate>{ address: result[0][i], shareBP: result[1][i] })
    }

    async getTransferTx(address: string, recipient: string, amount: bigint): Promise<Transaction> {
        let wnat = this._getContract(["function transfer(address recipient, uint256 amount) public returns (bool)"])        
        return this._getTx(address, BigInt(0), wnat.transfer, recipient, amount)
    }

    async getWrapTx(address: string, amount: bigint): Promise<Transaction>  {
        let wnat = this._getContract(["function deposit() public payable"])        
        return this._getTx(address, amount, wnat.deposit)
    }

    async getUnwrapTx(address: string, amount: bigint): Promise<Transaction>  {
        let wnat = this._getContract(["function withdraw(uint256 amount) external"])
        return this._getTx(address, BigInt(0), wnat.withdraw, amount)
    }

    async getBatchDelegateTx(address: string, delegates: Array<string>, sharesBP: Array<bigint>): Promise<Transaction> {
        let wnat = this._getContract(["function batchDelegate(address[] memory _delegatees, uint256[] memory _bips) external"])
        return this._getTx(address, BigInt(0), wnat.batchDelegate, delegates, sharesBP)
    }

    async getDelegateTx(address: string, delegate: string, shareBP: bigint): Promise<Transaction> {
        let wnat = this._getContract(["function delegate(address _to, uint256 _bips) external"])
        return this._getTx(address, BigInt(0), wnat.delegate, delegate, shareBP)
    }

    async getUndelegateTx(address: string): Promise<Transaction> {
        let wnat = this._getContract(["function undelegateAll() external"])
        return this._getTx(address, BigInt(0), wnat.undelegateAll)
    }

}