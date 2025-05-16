import { UnixNow } from "@flarenetwork/flarejs/dist/utils"
import { NetworkBased } from "../../core"
import { BN } from "@flarenetwork/flarejs"
import { UnsignedTx } from "@flarenetwork/flarejs/dist/apis/platformvm"

export class Import extends NetworkBased {

    async getTx(pAddress: string): Promise<UnsignedTx> {
        let sourceChain = this._core.cBlockchainId
        let pChainAddressForP = `P-${pAddress}`
        let utxosData = await this._core.flarejs.PChain().getUTXOs(pChainAddressForP, sourceChain)
        return this._core.flarejs.PChain().buildImportTx(
            utxosData.utxos,
            [pChainAddressForP],
            sourceChain,
            [pChainAddressForP],
            [pChainAddressForP],
            [pChainAddressForP],
            undefined,
            UnixNow(),
            new BN(0),
            1
        )
    }
}