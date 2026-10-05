import { TransferableOutput, type UnsignedTx, utils as futils } from "@flarenetwork/flarejs";
import { NetworkBased } from "../../core";

export class Export extends NetworkBased {
  async getTx(pAddress: string, amount: bigint): Promise<UnsignedTx> {
    const context = await this._core.flarejs.getContext();

    const destinationChainId = await this._core.flarejs.getCBlockchainId();
    const assetId = await this._core.flarejs.getAssetId();
    const pAddressForP = `P-${pAddress}`;
    const pAddressBytes = futils.bech32ToBytes(pAddressForP);
    const fromAddressesBytes = [pAddressBytes];
    const utxosData = await this._core.flarejs.pvmApi.getUTXOs({ addresses: [pAddressForP] });
    const utxos = utxosData.utxos;
    const output = TransferableOutput.fromNative(assetId, amount / BigInt(1e9), [pAddressBytes]);
    const outputs = [output];
    const feeState = await this._core.flarejs.getFeeState(this._core.const.pvmBaseFeeExtraRel);

    return this._core.flarejs.pvm.newExportTx(
      {
        feeState,
        destinationChainId,
        fromAddressesBytes,
        utxos,
        outputs,
      },
      context
    );
  }
}
