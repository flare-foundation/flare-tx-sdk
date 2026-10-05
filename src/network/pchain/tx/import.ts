import { type UnsignedTx, utils as futils } from "@flarenetwork/flarejs";
import { NetworkBased } from "../../core";

export class Import extends NetworkBased {
  async getTx(pAddress: string): Promise<UnsignedTx> {
    const context = await this._core.flarejs.getContext();

    const sourceChainId = await this._core.flarejs.getCBlockchainId();
    const pAddressForP = `P-${pAddress}`;
    const pAddressBytes = futils.bech32ToBytes(pAddressForP);
    const toAddressesBytes = [pAddressBytes];
    const fromAddressesBytes = [pAddressBytes];
    const utxosData = await this._core.flarejs.pvmApi.getUTXOs({ addresses: [pAddressForP], sourceChain: "C" });
    const utxos = utxosData.utxos;
    const locktime = BigInt(0);
    const threshold = 1;
    const feeState = await this._core.flarejs.getFeeState(this._core.const.pvmBaseFeeExtraRel);

    return this._core.flarejs.pvm.newImportTx(
      {
        feeState,
        sourceChainId,
        toAddressesBytes,
        fromAddressesBytes,
        utxos,
        locktime,
        threshold,
      },
      context
    );
  }
}
