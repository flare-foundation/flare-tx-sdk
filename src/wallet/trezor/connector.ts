export type PublicKeyRequest = {
    path: string,
    showOnTrezor: boolean
}

export type SignMessageRequest = {
    path: string,
    message: string,
    hex: boolean
}

export type SignTransactionRequest = {
    path: string,
    transaction: any
}

export interface TrezorConnector {

    ethereumGetPublicKey(request: PublicKeyRequest): Promise<any>
    ethereumSignMessage(request: SignMessageRequest): Promise<any>
    ethereumSignTransaction(request: SignTransactionRequest): Promise<any>

}