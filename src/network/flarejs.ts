import { evm, pvm } from "@flarenetwork/flarejs"
import { Context, getContextFromURI } from "@flarenetwork/flarejs/dist/vms/context"

export class Flarejs {

    constructor(rpc: string) {
        this._uri = new URL(rpc).hostname
        this.evm = evm
        this.pvm = pvm
    }

    private _uri: string
    private _context: Context

    evm: typeof evm
    pvm: typeof pvm

    private async _initContext(): Promise<void> {
        if (this._context) {
            this._context = await getContextFromURI(this._uri)
        }
    }

    async _getCBlockchainId(): Promise<string> {
        await this._initContext()
        return this._context.cBlockchainID
    }

    async _getPBlockchainId(): Promise<string> {
        await this._initContext()
        return this._context.pBlockchainID
    }

}