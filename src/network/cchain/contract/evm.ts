import { BaseContractMethod, Contract, Interface, InterfaceAbi, Transaction } from "ethers";
import { NetworkCore, NetworkBased } from "../../core";

export type EvmType2TxParams = {
    type: number,
    chainId: number,
    nonce: number,
    maxFeePerGas: bigint,
    maxPriorityFeePerGas: bigint
}

export abstract class Evm extends NetworkBased {

    protected async _getType2TxParams(sender: string): Promise<EvmType2TxParams> {
        let type = 2
        let chainId = this._core.cChainId
        let nonce = await this._core.ethers.getTransactionCount(sender)
        let feeData = await this._core.ethers.getFeeData()
        let maxFeePerGas = this._core.const.evmMaxFeePerGas
        if (feeData.maxFeePerGas) {
            maxFeePerGas = this._roundToGwei(feeData.maxFeePerGas)
        }
        let maxPriorityFeePerGas = this._core.const.evmMaxPriorityFeePerGas
        if (feeData.maxPriorityFeePerGas) {
            maxPriorityFeePerGas = this._roundToGwei(feeData.maxPriorityFeePerGas)
        }
        return { type, chainId, nonce, maxFeePerGas, maxPriorityFeePerGas }
    }

    private _roundToGwei(weiAmount: bigint): bigint {
        let factor = BigInt(1e9)
        return (weiAmount / factor) * factor
    }
}

export abstract class EvmContract extends Evm {

    constructor(network: NetworkCore, address: string) {
        super(network)
        this._address = address
    }

    protected _address: string

    protected _getContract(abi: InterfaceAbi): Contract {
        return new Contract(this._address, new Interface(abi), this._core.ethers)
    }

    protected async _getTx(
        sender: string,
        value: bigint,
        method: BaseContractMethod,
        ...params: any[]
    ): Promise<Transaction> {
        let args = await this._getType2TxParams(sender)
        let estimatedGasLimit: bigint
        try {
            estimatedGasLimit = await method.estimateGas(...params, { from: sender, value, ...args })            
        } catch (e: any) {
            if (e.reason || e.shortMessage) {
                throw new Error(`The transaction is expected to fail: ${e.reason ?? e.shortMessage}`)
            } else {
                throw e
            }
        }
        let gasLimitExtraFactor = 1 + this._core.const.evmGasLimitExtra
        let gasLimitExtra = Math.ceil(Number(estimatedGasLimit) * gasLimitExtraFactor)
        let gasLimitRoundFactor = 1e3
        let gasLimit = BigInt(Math.ceil(gasLimitExtra / gasLimitRoundFactor) * gasLimitRoundFactor)
        let txData = await method.populateTransaction(...params, { gasLimit, value, ...args })
        return Transaction.from(txData)
    }

}