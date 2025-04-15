export class LedgerCore {

    constructor(transport: any) {
        this._transport = transport
    }

    protected _transport: any

    static readonly FLR = "Flare Network"
    static readonly ETH = "Ethereum"

    async getActiveApp(): Promise<string> {
        try {
            let response = await this._transport.send(0xb0, 0x01, 0, 0)
            return response.slice(2, 2 + response[1]).toString("ascii")        
        } catch {
            throw new Error("Cannot identify the app running on ledger")
        }
    }

    async requireApp(app: string): Promise<void> {
        let activeApp = await this.getActiveApp()
        if (app !== activeApp) {
            throw new Error(`Active app on ledger is ${activeApp} but should be ${app}`)
        }
    }

}