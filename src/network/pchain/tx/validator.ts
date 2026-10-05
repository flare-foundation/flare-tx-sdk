import { type UnsignedTx, utils as futils, networkIDs } from "@flarenetwork/flarejs";
import { NetworkBased } from "../../core";

export class Validator extends NetworkBased {
  async getTx(
    pAddress: string,
    amount: bigint,
    nodeId: string,
    start: bigint,
    end: bigint,
    delegationFee: bigint,
    popBLSPublicKey: string,
    popBLSSignature: string
  ): Promise<UnsignedTx> {
    const context = await this._core.flarejs.getContext();

    const pAddressForP = `P-${pAddress}`;
    const pAddressBytes = futils.bech32ToBytes(pAddressForP);
    const fromAddressesBytes = [pAddressBytes];
    const rewardAddresses = [pAddressBytes];
    const delegatorRewardsOwner = [pAddressBytes];
    const changeAddressesBytes = [pAddressBytes];
    const subnetId = networkIDs.PrimaryNetworkID.toString();
    const utxosData = await this._core.flarejs.pvmApi.getUTXOs({ addresses: [pAddressForP] });
    const utxos = utxosData.utxos;
    const weight = amount / BigInt(1e9);
    const shares = Number(delegationFee) * 1e2;
    const locktime = BigInt(0);
    const threshold = 1;
    const publicKey = futils.hexToBuffer(popBLSPublicKey);
    const signature = futils.hexToBuffer(popBLSSignature);
    const feeState = await this._core.flarejs.getFeeState(this._core.const.pvmBaseFeeExtraRel);

    return this._core.flarejs.pvm.newAddPermissionlessValidatorTx(
      {
        feeState,
        fromAddressesBytes,
        subnetId,
        nodeId,
        start,
        end,
        weight,
        rewardAddresses,
        delegatorRewardsOwner,
        changeAddressesBytes,
        utxos,
        shares,
        threshold,
        locktime,
        publicKey,
        signature,
      },
      context
    );
  }
}
