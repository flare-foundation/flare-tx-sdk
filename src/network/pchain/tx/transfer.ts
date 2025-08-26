import { TransferableOutput, UnsignedTx, utils as futils } from "@flarenetwork/flarejs";
import { NetworkBased } from "../../core";

export class Transfer extends NetworkBased {

    async getTx(sender: string, recipient: string, amount: bigint): Promise<UnsignedTx> {
        let assetId = await this._core.flarejs.getAssetId()
        let senderForP = `P-${sender}`
        let senderBytes = futils.bech32ToBytes(senderForP)
        let recipientBytes = futils.bech32ToBytes(`P-${recipient}`)
        let utxosData = await this._core.flarejs.pvmApi.getUTXOs({ addresses: [senderForP] })
        let output = TransferableOutput.fromNative(assetId, amount / BigInt(1e9), [recipientBytes])
        return this._core.flarejs.pvm.newBaseTx(
            await this._core.flarejs.getContext(),
            [senderBytes],
            utxosData.utxos,
            [output],
            { locktime: BigInt(0), threshold: 1 }
        )
    }

}