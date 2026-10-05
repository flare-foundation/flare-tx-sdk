import { type EVMUnsignedTx, utils as futils } from "@flarenetwork/flarejs";
import { NetworkBased } from "../../core";

export class Export extends NetworkBased {
  async getTx(cAddress: string, pAddress: string, amount: bigint, baseFee: bigint): Promise<EVMUnsignedTx> {
    const amountGwei = amount / BigInt(1e9);
    const fee = await this._getTxFee(cAddress, pAddress, amountGwei, baseFee / BigInt(1e9));
    return this._getTx(cAddress, pAddress, amountGwei, fee);
  }

  private async _getTx(cAddress: string, pAddress: string, amount: bigint, fee: bigint): Promise<EVMUnsignedTx> {
    const pBlockchainId = await this._core.flarejs.getPBlockchainId();
    const assetId = await this._core.flarejs.getAssetId();
    const nonce = await this._core.ethers.getTransactionCount(cAddress);
    return this._core.flarejs.evm.newExportTx(
      await this._core.flarejs.getContext(),
      amount,
      pBlockchainId,
      futils.hexToBuffer(cAddress),
      [futils.bech32ToBytes(`P-${pAddress}`)],
      fee,
      BigInt(nonce),
      assetId,
      { locktime: BigInt(0), threshold: 1 }
    );
  }

  private async _getTxFee(cAddress: string, pAddress: string, amount: bigint, baseFee: bigint): Promise<bigint> {
    const tx = await this._getTx(cAddress, pAddress, amount, BigInt(0));
    const cost = futils.costCorethTx(tx);
    return baseFee * BigInt(cost);
  }
}
