import { UnixNow } from "@flarenetwork/flarejs/dist/utils"
import { NetworkBased } from "../../core"
import { Utils } from "../../utils"
import { UnsignedTx } from "@flarenetwork/flarejs/dist/apis/platformvm"
import { BN } from "@flarenetwork/flarejs"

export class Delegation extends NetworkBased {

    async getTx(
        pAddress: string,
        amount: bigint,
        nodeId: string,
        startTime: bigint,
        endTime: bigint
    ): Promise<UnsignedTx> {
        let pChainAddressForP = `P-${pAddress}`
        let utxosData = await this._core.avalanche.PChain().getUTXOs(pChainAddressForP)
        return this._core.avalanche.PChain().buildAddDelegatorTx(
            utxosData.utxos,
            [pChainAddressForP],
            [pChainAddressForP],
            [pChainAddressForP],
            nodeId,
            Utils.toBn(startTime),
            Utils.toBn(endTime),
            Utils.toBn(amount / BigInt(1e9)),
            [pChainAddressForP],
            new BN(0),
            1,
            undefined,
            UnixNow()
        )
    }

}