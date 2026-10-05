import { NetworkBased } from "../../core";
import { type EVMUnsignedTx, utils as futils } from "@flarenetwork/flarejs";

export class Import extends NetworkBased {
  async getTx(cAddress: string, pAddress: string, baseFee: bigint): Promise<EVMUnsignedTx> {
    const fee = await this._getTxFee(cAddress, pAddress, baseFee / BigInt(1e9));
    return this._getTx(cAddress, pAddress, fee);
  }

  private async _getTxFee(cAddress: string, pAddress: string, baseFee: bigint): Promise<bigint> {
    const cost = futils.costCorethTx(await this._getTx(cAddress, pAddress, BigInt(0)));
    return baseFee * BigInt(cost);
  }

  private async _getTx(cAddress: string, pAddress: string, importFee: bigint): Promise<EVMUnsignedTx> {
    const pAddressForC = `C-${pAddress}`;
    const pBlockchainId = await this._core.flarejs.getPBlockchainId();
    const utxosData = await this._core.flarejs.evmApi.getUTXOs({ addresses: [pAddressForC], sourceChain: "P" });
    return this._core.flarejs.evm.newImportTx(
      await this._core.flarejs.getContext(),
      futils.hexToBuffer(cAddress),
      [futils.bech32ToBytes(`C-${pAddress}`)],
      utxosData.utxos,
      pBlockchainId,
      importFee
    );
  }
}
