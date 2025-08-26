import { NetworkBased } from "../../core";
import { EVMUnsignedTx, utils as futils } from "@flarenetwork/flarejs";

export class Import extends NetworkBased {

    async getTx(
        cAddress: string, pAddress: string, baseFee: bigint
    ): Promise<EVMUnsignedTx> {
        let fee = await this._getTxFee(cAddress, pAddress, baseFee / BigInt(1e9))
        return this._getTx(cAddress, pAddress, fee)
    }
    
    private async _getTxFee(
        cAddress: string, pAddress: string, baseFee: bigint
    ): Promise<bigint> {
        let cost = futils.costCorethTx(await this._getTx(cAddress, pAddress, BigInt(0)))
        return baseFee * BigInt(cost)
    }
    
    private async _getTx(
        cAddress: string,
        pAddress: string,
        importFee: bigint
    ): Promise<EVMUnsignedTx> {
        let pAddressForC = `C-${pAddress}`
        let pBlockchainId = await this._core.flarejs.getPBlockchainId()
        let utxosData = await this._core.flarejs.evmApi.getUTXOs({ addresses: [pAddressForC], sourceChain: "P" })
        return this._core.flarejs.evm.newImportTx(
            await this._core.flarejs.getContext(),
            futils.hexToBuffer(cAddress),
            [futils.bech32ToBytes(`C-${pAddress}`)],
            utxosData.utxos,
            pBlockchainId,
            importFee
        )
    }

}