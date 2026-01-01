import { FdcAttestation } from "../../iotype";
import { NetworkBased } from "../../core";
import { Utils } from "../../utils";

export class FdcDataAvailability extends NetworkBased {

    private static ATTESTATION_NOT_FOUND_ERROR = "attestation request not found"
    private static ATTESTATION_NOT_FOUND_TIMEOUT_MS = 30000

    async getAttestation(request: string, roundId: number): Promise<FdcAttestation> {
        let requestData = {
            requestBytes: request,
            votingRoundId: roundId
        }
        let firstRequestTs = Date.now()
        while (Date.now() - firstRequestTs <= FdcDataAvailability.ATTESTATION_NOT_FOUND_TIMEOUT_MS) {
            let response = await fetch(
                `${this._core.const.api_FdcDABaseUrl}/api/v1/fdc/proof-by-request-round`,
                {
                    method: "POST",
                    headers: {
                        "X-API-KEY": this._core.const.api_FdcDAKey,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestData),
                }
            )
            let json = await response.json()
            if (!json.error) {
                return json
            }
            if (json.error == FdcDataAvailability.ATTESTATION_NOT_FOUND_ERROR) {
                await Utils.sleep(1000)
                continue
            }
            throw new Error(`Failed to obtain FDC attestation: ${json.error}`)
        }
        throw new Error(`Failed to obtain FDC attestation: ${FdcDataAvailability.ATTESTATION_NOT_FOUND_ERROR}`)
    }

}