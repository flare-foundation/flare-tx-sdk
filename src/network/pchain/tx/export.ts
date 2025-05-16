import { BN } from "@flarenetwork/flarejs"
import { NetworkBased } from "../../core"
import { UnsignedTx } from "@flarenetwork/flarejs/dist/apis/platformvm"
import { UnixNow } from "@flarenetwork/flarejs/dist/utils"
import { Utils } from "../../utils"

export class Export extends NetworkBased {

    async getTx(pAddress: string, amount: bigint): Promise<UnsignedTx> {
        let destinationChain = this._core.cBlockchainId
        let pChainAddressForC = `C-${pAddress}`
        let pChainAddressForP = `P-${pAddress}`
        let utxosData = await this._core.flarejs.PChain().getUTXOs(pChainAddressForP)
        return this._core.flarejs.PChain().buildExportTx(
            utxosData.utxos,
            Utils.toBn(amount / BigInt(1e9)),
            destinationChain,
            [pChainAddressForC],
            [pChainAddressForP],
            [pChainAddressForP],
            undefined,
            UnixNow(),
            new BN(0),
            1
        )
    }

}