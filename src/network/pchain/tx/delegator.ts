import { type UnsignedTx, utils as futils, networkIDs } from "@flarenetwork/flarejs";
import { NetworkBased } from "../../core";

export class Delegator extends NetworkBased {
  async getTx(pAddress: string, amount: bigint, nodeId: string, start: bigint, end: bigint): Promise<UnsignedTx> {
    const context = await this._core.flarejs.getContext();

    const pAddressForP = `P-${pAddress}`;
    const pAddressBytes = futils.bech32ToBytes(pAddressForP);
    const fromAddressesBytes = [pAddressBytes];
    const utxosData = await this._core.flarejs.pvmApi.getUTXOs({ addresses: [pAddressForP] });
    const utxos = utxosData.utxos;
    const subnetId = networkIDs.PrimaryNetworkID.toString();
    const weight = amount / BigInt(1e9);
    const rewardAddresses = [pAddressBytes];
    const locktime = BigInt(0);
    const threshold = 1;
    const feeState = await this._core.flarejs.getFeeState(this._core.const.pvmBaseFeeExtraRel);

    return this._core.flarejs.pvm.newAddPermissionlessDelegatorTx(
      {
        feeState,
        utxos,
        fromAddressesBytes,
        nodeId,
        subnetId,
        start,
        end,
        weight,
        rewardAddresses,
        locktime,
        threshold,
      },
      context
    );
  }
}
