import { UnsignedTx, utils as futils } from "@flarenetwork/flarejs"
import { NetworkBased } from "../../core"

export class Import extends NetworkBased {

    async getTx(pAddress: string): Promise<UnsignedTx> {
        let context = await this._core.flarejs.getContext()

        let sourceChainId = await this._core.flarejs.getCBlockchainId()
        let pAddressForP = `P-${pAddress}`
        let pAddressBytes = futils.bech32ToBytes(pAddressForP)
        let toAddressesBytes = [pAddressBytes]
        let fromAddressesBytes = [pAddressBytes]
        let utxosData = await this._core.flarejs.pvmApi.getUTXOs({ addresses: [pAddressForP], sourceChain: "C" })
        let utxos = utxosData.utxos
        let locktime = BigInt(0)
        let threshold = 1

        if (await this._core.flarejs.isEtnaForkActive()) {
            let feeState = await this._core.flarejs.getFeeState(this._core.const.pvmBaseFeeExtraRel)

            return this._core.flarejs.pvm.e.newImportTx(
                {
                    feeState,
                    sourceChainId,
                    toAddressesBytes,
                    fromAddressesBytes,
                    utxos,
                    locktime,
                    threshold
                },
                context
            )
        } else {
            return this._core.flarejs.pvm.newImportTx(
                context,
                sourceChainId,
                utxos,
                toAddressesBytes,
                fromAddressesBytes,
                { locktime, threshold }
            )
        }
    }
}