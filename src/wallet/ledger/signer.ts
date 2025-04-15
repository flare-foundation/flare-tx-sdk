export interface FlrApp {
    transport: any
    getAddressAndPubKey(path: string): Promise<any>
    signPersonalMessage(path: string, messageHex: string): Promise<any>
    signEVMTransaction(path: any, rawTxHex: any, resolution?: any): Promise<any>
    sign(path: string, message: Buffer): Promise<any>
}

export interface EthApp {
    transport: any
    getAddress(path: string): Promise<any>
    signPersonalMessage(path: string, messageHex: string): Promise<any>
    signTransaction(path: string, rawTxHex: string, resolution?: any): Promise<any>
}