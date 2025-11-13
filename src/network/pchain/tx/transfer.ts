import { TransferableOutput, UnsignedTx, utils as futils } from "@flarenetwork/flarejs";
import { NetworkBased } from "../../core";

export class Transfer extends NetworkBased {

    async getTx(sender: string, recipient: string, amount: bigint): Promise<UnsignedTx> {
        let context = await this._core.flarejs.getContext()

        let assetId = await this._core.flarejs.getAssetId()
        let senderForP = `P-${sender}`
        let senderBytes = futils.bech32ToBytes(senderForP)
        let fromAddressesBytes = [senderBytes]
        let recipientBytes = futils.bech32ToBytes(`P-${recipient}`)
        let utxosData = await this._core.flarejs.pvmApi.getUTXOs({ addresses: [senderForP] })
        let utxos = utxosData.utxos
        let output = TransferableOutput.fromNative(assetId, amount / BigInt(1e9), [recipientBytes])
        let outputs = [output]

        if (await this._core.flarejs.isEtnaForkActive()) {
            let feeState = await this._core.flarejs.getFeeState(this._core.const.pvmBaseFeeExtraRel)

            return this._core.flarejs.pvm.e.newBaseTx(
                {
                    feeState,
                    fromAddressesBytes,
                    utxos,
                    outputs
                },
                context
            )
        } else {
            return this._core.flarejs.pvm.newBaseTx(
                context,
                fromAddressesBytes,
                utxos,
                outputs,
                { locktime: BigInt(0), threshold: 1 }
            )
        }
    }

}