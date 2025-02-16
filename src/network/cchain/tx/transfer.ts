import { Transaction } from "ethers"
import { Evm } from "../contract/evm"

export class Transfer extends Evm {

    async getTx(sender: string, recipient: string, amount: bigint): Promise<Transaction> {
        let params = await this._getType2TxParams(sender, amount)
        return Transaction.from(
            { to: recipient, gasLimit: this._core.const.evmTransferGasLimit, ...params })
    }

}