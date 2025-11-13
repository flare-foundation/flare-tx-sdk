import { UnsignedTx, utils as futils, networkIDs } from "@flarenetwork/flarejs"
import { NetworkBased } from "../../core"

export class Delegator extends NetworkBased {

    async getTx(
        pAddress: string,
        amount: bigint,
        nodeId: string,
        start: bigint,
        end: bigint
    ): Promise<UnsignedTx> {
        let context = await this._core.flarejs.getContext()

        let pAddressForP = `P-${pAddress}`
        let pAddressBytes = futils.bech32ToBytes(pAddressForP)
        let fromAddressesBytes = [pAddressBytes]
        let utxosData = await this._core.flarejs.pvmApi.getUTXOs({ addresses: [pAddressForP] })
        let utxos = utxosData.utxos
        let subnetId = networkIDs.PrimaryNetworkID.toString()
        let weight = amount / BigInt(1e9)
        let rewardAddresses = [pAddressBytes]
        let locktime = BigInt(0)
        let threshold = 1

        if (await this._core.flarejs.isEtnaForkActive()) {
            let feeState = await this._core.flarejs.getFeeState(this._core.const.pvmBaseFeeExtraRel)

            return this._core.flarejs.pvm.e.newAddPermissionlessDelegatorTx(
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
                    threshold
                },
                context
            )
        } else {
            return this._core.flarejs.pvm.newAddPermissionlessDelegatorTx(
                context,
                utxos,
                fromAddressesBytes,
                nodeId,
                subnetId,
                start,
                end,
                weight,
                rewardAddresses,
                { locktime, threshold }
            )
        }

    }

}