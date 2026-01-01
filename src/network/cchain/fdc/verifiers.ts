import { ethers } from "ethers";
import { NetworkBased } from "../../core";
import { FdcSourceNetwork } from "../../iotype";

enum AttestationType {
    EVM_TRANSACTION = "EVMTransaction",
    PAYMENT = "Payment",
    ADDRESS_VALIDITY = "AddressValidity"
}

export class FdcVerifiers extends NetworkBased {

    async prepareEvmTransactionRequest(
        source: FdcSourceNetwork,
        txId: string
    ): Promise<string> {
        let attestationType = this._getAttestationType(AttestationType.EVM_TRANSACTION)
        let sourceId = this._getSourceId(source)
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
                apiUrl = `${this._core.const.api_FdcMainnetVerifiersBaseUrl}/verifier/eth`
                apiKey = this._core.const.api_FdcMainnetVerifiersKey
                break
            case FdcSourceNetwork.FLR:
                apiUrl = `${this._core.const.api_FdcMainnetVerifiersBaseUrl}/verifier/flr`
                apiKey = this._core.const.api_FdcMainnetVerifiersKey
                break
            case FdcSourceNetwork.SGB:
                apiUrl = `${this._core.const.api_FdcMainnetVerifiersBaseUrl}/verifier/sgb`
                apiKey = this._core.const.api_FdcMainnetVerifiersKey
                break
            case FdcSourceNetwork.ETH_TEST:
                apiUrl = `${this._core.const.api_FdcTestnetVerifiersBaseUrl}/verifier/eth`
                apiKey = this._core.const.api_FdcTestnetVerifiersKey
                break
            case FdcSourceNetwork.FLR_TEST:
                apiUrl = `${this._core.const.api_FdcTestnetVerifiersBaseUrl}/verifier/flr`
                apiKey = this._core.const.api_FdcTestnetVerifiersKey
                break
            case FdcSourceNetwork.SGB_TEST:
                apiUrl = `${this._core.const.api_FdcTestnetVerifiersBaseUrl}/verifier/sgb`
                apiKey = this._core.const.api_FdcTestnetVerifiersKey
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
        sender?: string,
        recipient?: string
    ): Promise<string> {
        let attestationType = this._getAttestationType(AttestationType.PAYMENT)
        let sourceId = this._getSourceId(source)
        let requestBody = {
            transactionId: txId,
            inUtxo: sender ? ethers.id(sender) : "0",
            utxo: recipient ? ethers.id(recipient) : "0"
        }
        let apiUrl: string
        let apiKey: string
        switch (source) {
            case FdcSourceNetwork.BTC:
                apiUrl = `${this._core.const.api_FdcMainnetVerifiersBaseUrl}/verifier/btc`
                apiKey = this._core.const.api_FdcMainnetVerifiersKey
                break
            case FdcSourceNetwork.DOGE:
                apiUrl = `${this._core.const.api_FdcMainnetVerifiersBaseUrl}/verifier/doge`
                apiKey = this._core.const.api_FdcMainnetVerifiersKey
                break
            case FdcSourceNetwork.XRP:
                apiUrl = `${this._core.const.api_FdcMainnetVerifiersBaseUrl}/verifier/xrp`
                apiKey = this._core.const.api_FdcMainnetVerifiersKey
                break
            case FdcSourceNetwork.BTC_TEST:
                apiUrl = `${this._core.const.api_FdcTestnetVerifiersBaseUrl}/verifier/btc`
                apiKey = this._core.const.api_FdcTestnetVerifiersKey
                break
            case FdcSourceNetwork.DOGE_TEST:
                apiUrl = `${this._core.const.api_FdcTestnetVerifiersBaseUrl}/verifier/doge`
                apiKey = this._core.const.api_FdcTestnetVerifiersKey
                break
            case FdcSourceNetwork.XRP_TEST:
                apiUrl = `${this._core.const.api_FdcTestnetVerifiersBaseUrl}/verifier/xrp`
                apiKey = this._core.const.api_FdcTestnetVerifiersKey
                break
            default:
                throw new Error(`${source} is not supported source for payment attestation request`)
        }
        apiUrl = `${apiUrl}/Payment/prepareRequest`
        return this._prepareRequest(apiUrl, apiKey, attestationType, sourceId, requestBody)
    }

    async prepareAddressValidityRequest(
        source: FdcSourceNetwork,
        address: string
    ): Promise<string> {
        let attestationType = this._getAttestationType(AttestationType.ADDRESS_VALIDITY)        
        let sourceId = this._getSourceId(source)
        let requestBody = {
            addressStr: address
        }
        let apiUrl: string
        let apiKey: string
        switch (source) {
            case FdcSourceNetwork.BTC:
                apiUrl = `${this._core.const.api_FdcMainnetVerifiersBaseUrl}/verifier/btc`
                apiKey = this._core.const.api_FdcMainnetVerifiersKey
                break
            case FdcSourceNetwork.DOGE:
                apiUrl = `${this._core.const.api_FdcMainnetVerifiersBaseUrl}/verifier/doge`
                apiKey = this._core.const.api_FdcMainnetVerifiersKey
                break
            case FdcSourceNetwork.XRP:
                apiUrl = `${this._core.const.api_FdcMainnetVerifiersBaseUrl}/verifier/xrp`
                apiKey = this._core.const.api_FdcMainnetVerifiersKey
                break
            case FdcSourceNetwork.BTC_TEST:
                apiUrl = `${this._core.const.api_FdcTestnetVerifiersBaseUrl}/verifier/btc`
                apiKey = this._core.const.api_FdcTestnetVerifiersKey
                break
            case FdcSourceNetwork.DOGE_TEST:
                apiUrl = `${this._core.const.api_FdcTestnetVerifiersBaseUrl}/verifier/doge`
                apiKey = this._core.const.api_FdcTestnetVerifiersKey
                break
            case FdcSourceNetwork.XRP_TEST:
                apiUrl = `${this._core.const.api_FdcTestnetVerifiersBaseUrl}/verifier/xrp`
                apiKey = this._core.const.api_FdcTestnetVerifiersKey
                break
            default:
                throw new Error(`${source} is not supported source for address validity attestation request`)
        }
        apiUrl = `${apiUrl}/AddressValidity/prepareRequest`
        return this._prepareRequest(apiUrl, apiKey, attestationType, sourceId, requestBody)
    }

    private _getAttestationType(type: AttestationType): string {
        return ethers.zeroPadBytes(ethers.toUtf8Bytes(type), 32)
    }

    private _getSourceId(source: FdcSourceNetwork) {
        return ethers.zeroPadBytes(ethers.toUtf8Bytes(source), 32)
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
            }
        )
        let json = await response.json()
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
                message += `: ${info.join(", ")})`
            }
            throw new Error(message)
        }
        return json.abiEncodedRequest
    }
}