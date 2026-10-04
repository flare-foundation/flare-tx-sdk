import { ethers } from "ethers";
import { NetworkBased } from "../../core";
import { FdcSourceNetwork } from "../../iotype";
import { AttestationType, AttestationTypes } from "./attestation_type";

export class FdcVerifiers extends NetworkBased {

    private static REQUEST_TIMEOUT_MS = 20000

    async prepareEvmTransactionRequest(
        source: FdcSourceNetwork,
        txId: string
    ): Promise<string> {
        let attestationType = AttestationTypes.getCode(AttestationType.EVM_TRANSACTION)
        let sourceId = this._getNetworkSourceId(source)
        let requestBody = {
            transactionHash: txId,
            requiredConfirmations: "1",
            provideInput: true,
            listEvents: true,
            logIndices: []
        }
        let apiUrl: string
        let apiKey: string
        switch (source) {
            case FdcSourceNetwork.ETH:
                apiUrl = `${this._core.const.api_FdcVerifiersBaseUrl}/verifier/eth`
                apiKey = this._core.const.api_FdcVerifiersKey
                break
            case FdcSourceNetwork.FLR:
                apiUrl = `${this._core.const.api_FdcVerifiersBaseUrl}/verifier/flr`
                apiKey = this._core.const.api_FdcVerifiersKey
                break
            case FdcSourceNetwork.SGB:
                apiUrl = `${this._core.const.api_FdcVerifiersBaseUrl}/verifier/sgb`
                apiKey = this._core.const.api_FdcVerifiersKey
                break
            default:
                throw new Error(`${source} is not supported source for EVM transaction attestation request`)
        }
        apiUrl = `${apiUrl}/EVMTransaction/prepareRequest`
        return this._prepareRequest(apiUrl, apiKey, attestationType, sourceId, requestBody)
    }

    async preparePaymentRequest(
        source: FdcSourceNetwork,
        txId: string,
        senderUtxo?: number | string,
        recipientUtxo?: number | string
    ): Promise<string> {
        let attestationType = AttestationTypes.getCode(AttestationType.PAYMENT)
        let sourceId = this._getNetworkSourceId(source)
        let requestBody = {
            transactionId: txId,
            inUtxo: this._getUtxoParameter(senderUtxo),
            utxo: this._getUtxoParameter(recipientUtxo)
        }
        let apiUrl: string
        let apiKey: string
        switch (source) {
            case FdcSourceNetwork.BTC:
                apiUrl = `${this._core.const.api_FdcVerifiersBaseUrl}/verifier/btc`
                apiKey = this._core.const.api_FdcVerifiersKey
                break
            case FdcSourceNetwork.DOGE:
                apiUrl = `${this._core.const.api_FdcVerifiersBaseUrl}/verifier/doge`
                apiKey = this._core.const.api_FdcVerifiersKey
                break
            case FdcSourceNetwork.XRP:
                apiUrl = `${this._core.const.api_FdcVerifiersBaseUrl}/verifier/xrp`
                apiKey = this._core.const.api_FdcVerifiersKey
                break
            default:
                throw new Error(`${source} is not supported source for payment attestation request`)
        }
        apiUrl = `${apiUrl}/Payment/prepareRequest`
        return this._prepareRequest(apiUrl, apiKey, attestationType, sourceId, requestBody)
    }

    private _getUtxoParameter(utxo: string | number | undefined): string {
        if (!utxo) {
            return "0"
        }
        if (typeof utxo === "number") {
            return utxo.toString()
        }
        if (Number.isInteger(Number(utxo))) {
            return utxo.toString()
        }
        return ethers.id(utxo)
    }

    async prepareAddressValidityRequest(
        source: FdcSourceNetwork,
        address: string
    ): Promise<string> {
        let attestationType = AttestationTypes.getCode(AttestationType.ADDRESS_VALIDITY)
        let sourceId = this._getNetworkSourceId(source)
        let requestBody = {
            addressStr: address
        }
        let apiUrl: string
        let apiKey: string
        switch (source) {
            case FdcSourceNetwork.BTC:
                apiUrl = `${this._core.const.api_FdcVerifiersBaseUrl}/verifier/btc`
                apiKey = this._core.const.api_FdcVerifiersKey
                break
            case FdcSourceNetwork.DOGE:
                apiUrl = `${this._core.const.api_FdcVerifiersBaseUrl}/verifier/doge`
                apiKey = this._core.const.api_FdcVerifiersKey
                break
            case FdcSourceNetwork.XRP:
                apiUrl = `${this._core.const.api_FdcVerifiersBaseUrl}/verifier/xrp`
                apiKey = this._core.const.api_FdcVerifiersKey
                break
            default:
                throw new Error(`${source} is not supported source for address validity attestation request`)
        }
        apiUrl = `${apiUrl}/AddressValidity/prepareRequest`
        return this._prepareRequest(apiUrl, apiKey, attestationType, sourceId, requestBody)
    }

    async prepareWeb2JsonRequest(
        url: string,
        httpMethod: string,
        headers: string,
        queryParams: string,
        body: string,
        postProcessJq: string,
        abiSignature: string
    ): Promise<string> {
        let attestationType = AttestationTypes.getCode(AttestationType.WEB2JSON)
        let sourceId = ethers.zeroPadBytes(ethers.toUtf8Bytes("PublicWeb2"), 32)
        let requestBody = { url, httpMethod, headers, queryParams, body, postProcessJq, abiSignature }
        let apiUrl = `${this._core.const.api_FdcVerifiersBaseUrl}/verifier/web2/Web2Json/prepareRequest`
        let apiKey = this._core.const.api_FdcVerifiersKey
        return this._prepareRequest(
            apiUrl,
            apiKey,
            attestationType,
            sourceId,
            requestBody
        )
    }

    private _getNetworkSourceId(source: FdcSourceNetwork) {
        let prefix = ["coston", "costwo"].includes(this._core.const.hrp) ? "test" : ""
        return ethers.zeroPadBytes(ethers.toUtf8Bytes(`${prefix}${source}`), 32)
    }

    private async _prepareRequest(
        apiUrl: string,
        apiKey: string,
        attestationType: string,
        sourceId: string,
        requestBody: any
    ): Promise<string> {
        let requestData = {
            attestationType,
            sourceId,
            requestBody
        }
        let response = await fetch(
            apiUrl,
            {
                method: "POST",
                headers: {
                    "X-API-KEY": apiKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestData),
                signal: AbortSignal.timeout(FdcVerifiers.REQUEST_TIMEOUT_MS)
            }
        )
        let json: any
        try {
            json = await response.json()
        } catch {
            throw new Error(`Failed to prepare FDC attestation request: `
                + `the verifier service at ${apiUrl} responded with status ${response.status}`)
        }
        if (!json.abiEncodedRequest) {
            let message = "Failed to prepare FDC attestation request"
            let info = []
            if (json.status) {
                info.push(json.status)
            }
            if (json.error) {
                info.push(json.error)
            }
            if (json.message) {
                info.push(json.message)
            }
            if (info.length > 0) {
                message += `: ${info.join(", ")}`
            }
            throw new Error(message)
        }
        return json.abiEncodedRequest
    }
}