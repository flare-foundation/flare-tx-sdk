import { UnsignedTx, utils as futils, networkIDs } from "@flarenetwork/flarejs"
import { NetworkBased } from "../../core"

export class Validator extends NetworkBased {

    async getTx(
        pAddress: string,
        amount: bigint,
        nodeId: string,
        startTime: bigint,
        endTime: bigint,
        delegationFee: bigint,
        popBLSPublicKey: string,
        popBLSSignature: string
    ): Promise<UnsignedTx> {
        let pAddressForP = `P-${pAddress}`
        let pAddressBytes = futils.bech32ToBytes(pAddressForP)
        let utxosData = await this._core.flarejs.pvmApi.getUTXOs({ addresses: [pAddressForP] })
        return this._core.flarejs.pvm.newAddPermissionlessValidatorTx(
            await this._core.flarejs.getContext(),
            utxosData.utxos,
            [pAddressBytes],
            nodeId,
            networkIDs.PrimaryNetworkID.toString(),
            startTime,
            endTime,
            amount / BigInt(1e9),
            [pAddressBytes],
            [pAddressBytes],
            Number(delegationFee) * 1e2,
            {
                changeAddresses: [pAddressBytes],
            },
            1,
            BigInt(0),
            futils.hexToBuffer(popBLSPublicKey),
            futils.hexToBuffer(popBLSSignature),
        )
    }

}