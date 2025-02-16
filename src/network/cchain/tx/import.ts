import { UnsignedTx } from "@flarenetwork/flarejs/dist/apis/evm";
import { NetworkBased } from "../../core";
import { costImportTx } from "@flarenetwork/flarejs/dist/utils";
import { Utils } from "../../utils";

export class Import extends NetworkBased {

    async getTx(
        cAddress: string, pAddress: string, baseFee: bigint
    ): Promise<UnsignedTx> {
        let fee = await this._getTxFee(cAddress, pAddress, baseFee / BigInt(1e9))
        return this._getTx(cAddress, pAddress, fee)
    }
    
    private async _getTxFee(
        cAddress: string, pAddress: string, baseFee: bigint
    ): Promise<bigint> {
        let cost = costImportTx(await this._getTx(cAddress, pAddress, BigInt(0)))
        return baseFee * BigInt(cost)
    }
    
    private async _getTx(
        cAddress: string,
        pAddress: string,
        importFee: bigint
    ): Promise<UnsignedTx> {
        let sourceChain = this._core.pBlockchainId
        let pAddressForC = `C-${pAddress}`
        let utxosData = await this._core.avalanche.CChain().getUTXOs(pAddressForC, sourceChain)
        return await this._core.avalanche.CChain().buildImportTx(
            utxosData.utxos,
            cAddress,
            [pAddressForC],
            sourceChain,
            [pAddressForC],
            Utils.toBn(importFee)
        )
    }

}