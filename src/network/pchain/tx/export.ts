import { TransferableOutput, UnsignedTx, utils as futils } from "@flarenetwork/flarejs"
import { NetworkBased } from "../../core"

export class Export extends NetworkBased {

    async getTx(pAddress: string, amount: bigint): Promise<UnsignedTx> {
        let context = await this._core.flarejs.getContext()

        let destinationChainId = await this._core.flarejs.getCBlockchainId()
        let assetId = await this._core.flarejs.getAssetId()
        let pAddressForP = `P-${pAddress}`
        let pAddressBytes = futils.bech32ToBytes(pAddressForP)
        let fromAddressesBytes = [pAddressBytes]
        let utxosData = await this._core.flarejs.pvmApi.getUTXOs({ addresses: [pAddressForP] })
        let utxos = utxosData.utxos
        let output = TransferableOutput.fromNative(assetId, amount / BigInt(1e9), [pAddressBytes])
        let outputs = [output]

        if (await this._core.flarejs.isEtnaForkActive()) {
            let feeState = await this._core.flarejs.getFeeState(this._core.const.pvmBaseFeeExtraRel)

            return this._core.flarejs.pvm.e.newExportTx(
                {
                    feeState,
                    destinationChainId,
                    fromAddressesBytes,
                    utxos,
                    outputs
                },
                context
            )
        } else {
            return this._core.flarejs.pvm.newExportTx(
                context,
                destinationChainId,
                fromAddressesBytes,
                utxosData.utxos,
                outputs,
                { locktime: BigInt(0), threshold: 1 }
            )
        }

    }

}