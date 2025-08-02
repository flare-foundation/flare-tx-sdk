import { EvmContract } from "./evm_contract";

export class GovernanceVotePower extends EvmContract {

    async getVotes(cAddress: string): Promise<bigint> {
        let vp = this._getContract(["function getVotes(address _who) public view returns (uint256)"])
        return vp.getVotes(cAddress)
    }

    async getDelegateOfAtNow(cAddress: string): Promise<string> {
        let vp = this._getContract(["function getDelegateOfAtNow(address _who) public view returns (address)"])
        return vp.getDelegateOfAtNow(cAddress)
    }

    async getDelegateOfAt(cAddress: string, blockNumber: bigint): Promise<string> {
        let vp = this._getContract(["function getDelegateOfAt(address _who, uint256 _blockNumber) public view returns (address)"])
        return vp.getDelegateOfAt(cAddress, blockNumber)
    }

    delegate(cAddress: string): string {
        let vp = this._getContract(["function delegate(address _to) public"])
        return this._getData(vp, vp.delegate, cAddress)
    }

    undelegate(): string {
        let vp = this._getContract(["function undelegate() public"])
        return this._getData(vp, vp.undelegate)
    }

}