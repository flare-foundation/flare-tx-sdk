import { UnsignedTx, utils as futils, networkIDs } from "@flarenetwork/flarejs"
import { NetworkBased } from "../../core"

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
        let context = await this._core.flarejs.getContext()

        let pAddressForP = `P-${pAddress}`
        let pAddressBytes = futils.bech32ToBytes(pAddressForP)
        let fromAddressesBytes = [pAddressBytes]
        let rewardAddresses = [pAddressBytes]
        let delegatorRewardsOwner = [pAddressBytes]
        let changeAddressesBytes = [pAddressBytes]
        let subnetId = networkIDs.PrimaryNetworkID.toString()
        let utxosData = await this._core.flarejs.pvmApi.getUTXOs({ addresses: [pAddressForP] })
        let utxos = utxosData.utxos
        let weight = amount / BigInt(1e9)
        let shares = Number(delegationFee) * 1e2
        let locktime = BigInt(0)
        let threshold = 1
        let publicKey = futils.hexToBuffer(popBLSPublicKey)
        let signature = futils.hexToBuffer(popBLSSignature)

        if (await this._core.flarejs.isEtnaForkActive()) {
            let feeState = await this._core.flarejs.getFeeState(this._core.const.pvmBaseFeeExtraRel)

            return this._core.flarejs.pvm.e.newAddPermissionlessValidatorTx(
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
                    signature
                },
                context
            )

        } else {
            return this._core.flarejs.pvm.newAddPermissionlessValidatorTx(
                context,
                utxos,
                fromAddressesBytes,
                nodeId,
                subnetId,
                start,
                end,
                weight,
                rewardAddresses,
                delegatorRewardsOwner,
                shares,
                {
                    changeAddresses: changeAddressesBytes,
                },
                threshold,
                locktime,
                publicKey,
                signature
            )
        }
    }

}