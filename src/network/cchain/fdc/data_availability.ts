import { FdcAttestation } from "../../iotype";
import { NetworkBased } from "../../core";
import { Utils } from "../../utils";

export class FdcDataAvailability extends NetworkBased {

    private static ATTESTATION_NOT_FOUND_ERROR = "attestation request not found"
    private static ATTESTATION_NOT_FOUND_TIMEOUT_MS = 60000
    private static ATTESTATION_NOT_FOUND_SLEEP_MS = 3000

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
            let json: any
            try {
                json = Utils.parseJsonWithBigInts(await response.text())
            } catch (e) {
                throw new Error(`Failed to parse response from FDC data availability service: ${e}`)
            }
            if (!json.error) {
                let timestamp = json.response?.lowestUsedTimestamp
                if (typeof timestamp !== "number" && typeof timestamp !== "bigint") {
                    throw new Error(`Failed to obtain FDC attestation: `
                        + `unexpected response from the data availability service (status ${response.status})`)
                }
                json.response.lowestUsedTimestamp = BigInt(json.response.lowestUsedTimestamp)
                return json
            }
            if (json.error == FdcDataAvailability.ATTESTATION_NOT_FOUND_ERROR) {
                await Utils.sleep(FdcDataAvailability.ATTESTATION_NOT_FOUND_SLEEP_MS)
                continue
            }
            throw new Error(`Failed to obtain FDC attestation: ${json.error}`)
        }
        throw new Error(`Failed to obtain FDC attestation: ${FdcDataAvailability.ATTESTATION_NOT_FOUND_ERROR}`)
    }

}