import { TransferableOutput, type UnsignedTx, utils as futils } from "@flarenetwork/flarejs";
import { NetworkBased } from "../../core";

export class Transfer extends NetworkBased {
  async getTx(sender: string, recipient: string, amount: bigint): Promise<UnsignedTx> {
    const context = await this._core.flarejs.getContext();

    const assetId = await this._core.flarejs.getAssetId();
    const senderForP = `P-${sender}`;
    const senderBytes = futils.bech32ToBytes(senderForP);
    const fromAddressesBytes = [senderBytes];
    const recipientBytes = futils.bech32ToBytes(`P-${recipient}`);
    const utxosData = await this._core.flarejs.pvmApi.getUTXOs({ addresses: [senderForP] });
    const utxos = utxosData.utxos;
    const output = TransferableOutput.fromNative(assetId, amount / BigInt(1e9), [recipientBytes]);
    const outputs = [output];
    const feeState = await this._core.flarejs.getFeeState(this._core.const.pvmBaseFeeExtraRel);

    return this._core.flarejs.pvm.newBaseTx(
      {
        feeState,
        fromAddressesBytes,
        utxos,
        outputs,
      },
      context
    );
  }
}
