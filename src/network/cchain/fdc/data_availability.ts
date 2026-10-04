import { FdcAttestation } from "../../iotype";
import { NetworkBased } from "../../core";
import { Utils } from "../../utils";

export class FdcDataAvailability extends NetworkBased {

    private static ATTESTATION_NOT_FOUND_ERROR = "attestation request not found"
    private static ATTESTATION_NOT_FOUND_TIMEOUT_MS = 60000
    private static ATTESTATION_NOT_FOUND_SLEEP_MS = 3000
    private static REQUEST_TIMEOUT_MS = 20000

    async getAttestation(request: string, roundId: number): Promise<FdcAttestation> {
        let requestData = {
            requestBytes: request,
            votingRoundId: roundId
        }
        let firstRequestTs = Date.now()
        let lastError: string = null
        while (true) {
            let remainingMs = FdcDataAvailability.ATTESTATION_NOT_FOUND_TIMEOUT_MS - (Date.now() - firstRequestTs)
            if (remainingMs <= 0) {
                break
            }
            let response: Response
            let json: any
            try {
                response = await fetch(
                    `${this._core.const.api_FdcDABaseUrl}/api/v1/fdc/proof-by-request-round`,
                    {
                        method: "POST",
                        headers: {
                            "X-API-KEY": this._core.const.api_FdcDAKey,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(requestData),
                        signal: AbortSignal.timeout(Math.min(remainingMs, FdcDataAvailability.REQUEST_TIMEOUT_MS))
                    }
                )
                json = Utils.parseJsonWithBigInts(await response.text())
                if (json === null || typeof json !== "object") {
                    throw new Error("the response body is not a JSON object")
                }
            } catch (e) {
                // network error, timeout or a non-JSON body (e.g., a proxy error page): retry until the deadline
                lastError = response ?
                    `the data availability service responded with status ${response.status} (${e})` :
                    `the data availability service is not reachable (${e})`
                await Utils.sleep(FdcDataAvailability.ATTESTATION_NOT_FOUND_SLEEP_MS)
                continue
            }
            if (!json.error) {
                let timestamp = json.response?.lowestUsedTimestamp
                if (typeof timestamp !== "number" && typeof timestamp !== "bigint") {
                    if (response.status >= 500 || response.status == 429) {
                        lastError = `the data availability service responded with status ${response.status}`
                        await Utils.sleep(FdcDataAvailability.ATTESTATION_NOT_FOUND_SLEEP_MS)
                        continue
                    }
                    throw new Error(`Failed to obtain FDC attestation: `
                        + `unexpected response from the data availability service (status ${response.status})`)
                }
                json.response.lowestUsedTimestamp = BigInt(json.response.lowestUsedTimestamp)
                return json
            }
            if (json.error == FdcDataAvailability.ATTESTATION_NOT_FOUND_ERROR) {
                lastError = FdcDataAvailability.ATTESTATION_NOT_FOUND_ERROR
                await Utils.sleep(FdcDataAvailability.ATTESTATION_NOT_FOUND_SLEEP_MS)
                continue
            }
            throw new Error(`Failed to obtain FDC attestation: ${json.error}`)
        }
        throw new Error(`Failed to obtain FDC attestation: ${lastError ?? FdcDataAvailability.ATTESTATION_NOT_FOUND_ERROR}`)
    }

}