import { UnsignedTx } from "@flarenetwork/flarejs/dist/apis/evm"
import { costExportTx } from "@flarenetwork/flarejs/dist/utils"
import { NetworkBased } from "../../core"
import { BN } from "@flarenetwork/flarejs"
import { Utils } from "../../utils"

export class Export extends NetworkBased {

    async getTx(
        cAddress: string,
        pAddress: string,
        amount: bigint,
        baseFee: bigint
    ): Promise<UnsignedTx> {
        let amountGwei = amount / BigInt(1e9)
        let fee = await this._getTxFee(cAddress, pAddress, amountGwei, baseFee / BigInt(1e9))
        return this._getTx(cAddress, pAddress, amountGwei, fee)
    }

    private async _getTx(
        cAddress: string,
        pAddress: string,
        amount: bigint,
        fee: bigint
    ): Promise<UnsignedTx> {
        let pAddressForC = `C-${pAddress}`
        let pAddressForP = `P-${pAddress}`
        let nonce = await this._core.ethers.getTransactionCount(cAddress)
        return await this._core.flarejs.CChain().buildExportTx(
            Utils.toBn(amount),
            this._core.pAssetId,
            this._core.pBlockchainId,
            cAddress,
            pAddressForC,
            [pAddressForP],
            nonce,
            new BN(0),
            1,
            Utils.toBn(fee)
        )
    }

    private async _getTxFee(
        cAddress: string,
        pAddress: string,
        amount: bigint,
        baseFee: bigint
    ): Promise<bigint> {
        let tx = await this._getTx(cAddress, pAddress, amount, BigInt(0))
        let cost = costExportTx(tx)
        return baseFee * BigInt(cost)
    }

}