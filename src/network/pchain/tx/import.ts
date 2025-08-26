import { UnsignedTx, utils as futils } from "@flarenetwork/flarejs"
import { NetworkBased } from "../../core"

export class Import extends NetworkBased {

    async getTx(pAddress: string): Promise<UnsignedTx> {
        let cBlockchainId = await this._core.flarejs.getCBlockchainId()
        let pAddressForP = `P-${pAddress}`
        let pAddressBytes = futils.bech32ToBytes(pAddressForP)
        let utxosData = await this._core.flarejs.pvmApi.getUTXOs({ addresses: [pAddressForP], sourceChain: "C" })
        return this._core.flarejs.pvm.newImportTx(
            await this._core.flarejs.getContext(),
            cBlockchainId,
            utxosData.utxos,
            [pAddressBytes],
            [pAddressBytes],
            { locktime: BigInt(0), threshold: 1 }
        )
    }
}