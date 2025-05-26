import { UnsignedTx, utils as futils, networkIDs } from "@flarenetwork/flarejs"
import { NetworkBased } from "../../core"

export class Delegation extends NetworkBased {

    async getTx(
        pAddress: string,
        amount: bigint,
        nodeId: string,
        startTime: bigint,
        endTime: bigint
    ): Promise<UnsignedTx> {
        let pAddressForP = `P-${pAddress}`
        let pAddressBytes = futils.bech32ToBytes(pAddressForP)
        let utxosData = await this._core.flarejs.pvmApi.getUTXOs({ addresses: [pAddressForP] })
        return this._core.flarejs.pvm.newAddPermissionlessDelegatorTx(
            this._core.flarejs.context,
            utxosData.utxos,
            [pAddressBytes],
            nodeId,
            networkIDs.PrimaryNetworkID.toString(),
            startTime,
            endTime,
            amount / BigInt(1e9),
            [pAddressBytes],
            { locktime: BigInt(0), threshold: 1 }
        )
    }

}