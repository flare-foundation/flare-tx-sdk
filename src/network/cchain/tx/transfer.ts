import { Transaction } from "ethers"
import { Evm } from "../contract/evm"

export class Transfer extends Evm {

    async getTx(sender: string, recipient: string, amount: bigint): Promise<Transaction> {
        let params = await this._getType2TxParams(sender)
        let gasLimit = this._core.const.evmTransferGasLimit
        return Transaction.from({ to: recipient, value: amount, gasLimit, ...params })
    }

    async getWipeTx(sender: string, recipient: string, balance: bigint): Promise<Transaction> {
        let params = await this._getType2TxParams(sender)
        let gasLimit = this._core.const.evmTransferGasLimit
        let value = balance - gasLimit * params.maxFeePerGas
        if (value < 0) {
            throw new Error("Balance too low to execute transfer")
        }
        return Transaction.from({ to: recipient, value, gasLimit, ...params })
    }

}