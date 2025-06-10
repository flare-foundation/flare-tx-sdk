import { ethers } from "ethers";
import { EvmContract } from "./evm_contract";
import { Account } from "../../account"

export class SafeProxy extends EvmContract {

    async getOwners(): Promise<Array<string>> {
        let proxy = this._getContract(["function getOwners() public view returns (address[] memory)"])
        let result = await proxy.getOwners() as Array<any>
        return result.map(a => Account.normalizedCAddress(a))
    }

    async getThreshold(): Promise<bigint> {
        let proxy = this._getContract(["function getThreshold() public view returns (uint256)"])
        return proxy.getThreshold()
    }

    async getNonce(): Promise<bigint> {
        let proxy = this._getContract(["function nonce() public view returns (uint256)"])
        return proxy.nonce()
    }

    async isHashApprovedByOwner(owner: string, hash: string): Promise<boolean> {
        let proxy = this._getContract(["function approvedHashes(address owner, bytes32 hash) public view returns (uint256)"])
        let result = await proxy.approvedHashes(owner, hash)
        return result === BigInt(1)
    }

    async getTransactionHash(to: string, value: bigint, data: string, operation: bigint, safeTxGas: bigint, baseGas: bigint, gasPrice: bigint, gasToken: string, refundReceiver: string, nonce: bigint): Promise<string> {
        let proxy = this._getContract(["function getTransactionHash(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) public view returns (bytes32)"])
        return proxy.getTransactionHash(to, value, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, nonce)
    }

    setup(owners: Array<string>, threshold: bigint, fallbackHandler: string): string {
        let singleton = this._getContract(["function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver) external"])
        return this._getData(singleton, singleton.setup, owners, threshold, ethers.ZeroAddress, "0x", fallbackHandler, ethers.ZeroAddress, BigInt(0), ethers.ZeroAddress)
    }

    approveHash(hash: string): string {
        let proxy = this._getContract(["function approveHash(bytes32 hashToApprove) external"])
        return this._getData(proxy, proxy.approveHash, hash)
    }

    execTransaction(to: string, value: bigint, data: string, operation: bigint, safeTxGas: bigint, baseGas: bigint, gasPrice: bigint, gasToken: string, refundReceiver: string, signatures: string): string {
        let proxy = this._getContract(["function execTransaction(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes memory signatures) public payable returns (bool)"])
        return this._getData(proxy, proxy.execTransaction, to, value, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, signatures)
    }

}