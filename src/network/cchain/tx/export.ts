import { EVMUnsignedTx, utils as futils } from "@flarenetwork/flarejs"
import { NetworkBased } from "../../core"

export class Export extends NetworkBased {

    async getTx(
        cAddress: string,
        pAddress: string,
        amount: bigint,
        baseFee: bigint
    ): Promise<EVMUnsignedTx> {
        let amountGwei = amount / BigInt(1e9)
        let fee = await this._getTxFee(cAddress, pAddress, amountGwei, baseFee / BigInt(1e9))
        return this._getTx(cAddress, pAddress, amountGwei, fee)
    }

    private async _getTx(
        cAddress: string,
        pAddress: string,
        amount: bigint,
        fee: bigint
    ): Promise<EVMUnsignedTx> {
        let pBlockchainId = await this._core.flarejs.getPBlockchainId()
        let assetId = await this._core.flarejs.getAssetId()
        let nonce = await this._core.ethers.getTransactionCount(cAddress)
        return this._core.flarejs.evm.newExportTx(
            this._core.flarejs.context,
            amount,
            pBlockchainId,
            futils.hexToBuffer(cAddress),
            [futils.bech32ToBytes(`P-${pAddress}`)],
            fee,
            BigInt(nonce),
            assetId,
            { locktime: BigInt(0), threshold: 1 }
        )
    }

    private async _getTxFee(
        cAddress: string,
        pAddress: string,
        amount: bigint,
        baseFee: bigint
    ): Promise<bigint> {
        let tx = await this._getTx(cAddress, pAddress, amount, BigInt(0))
        let cost = futils.costCorethTx(tx)
        return baseFee * BigInt(cost)
    }

}