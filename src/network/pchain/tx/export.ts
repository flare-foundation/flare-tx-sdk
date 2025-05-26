import { TransferableOutput, UnsignedTx, utils as futils } from "@flarenetwork/flarejs"
import { NetworkBased } from "../../core"

export class Export extends NetworkBased {

    async getTx(pAddress: string, amount: bigint): Promise<UnsignedTx> {
        let cBlockchainId = await this._core.flarejs.getCBlockchainId()
        let assetId = await this._core.flarejs.getAssetId()        
        let pAddressForP = `P-${pAddress}`
        let pAddressBytes = futils.bech32ToBytes(pAddressForP)
        let utxosData = await this._core.flarejs.pvmApi.getUTXOs({ addresses: [pAddressForP] })
        let output = TransferableOutput.fromNative(assetId, amount / BigInt(1e9), [pAddressBytes])
        return this._core.flarejs.pvm.newExportTx(
            this._core.flarejs.context,
            cBlockchainId,
            [pAddressBytes],
            utxosData.utxos,
            [output],
            { locktime: BigInt(0), threshold: 1 }
        )
    }

}