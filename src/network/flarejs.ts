import { evm, pvm } from "@flarenetwork/flarejs"
import { Context, getContextFromURI } from "@flarenetwork/flarejs/dist/vms/context"
import { EVMApi } from "@flarenetwork/flarejs/dist/vms/evm"
import { PVMApi } from "@flarenetwork/flarejs/dist/vms/pvm"

export class Flarejs {

    constructor(rpc: string, hrp: string) {
        this._uri = new URL(rpc).hostname
        this._hrp = hrp
        this.evm = evm
        this.evmApi = new EVMApi(this._uri)
        this.pvm = pvm
        this.pvmApi = new PVMApi(this._uri)
    }

    private _uri: string
    private _hrp: string
    
    context: Context

    evm: typeof evm
    evmApi: EVMApi

    pvm: typeof pvm
    pvmApi: PVMApi

    private async _initContext(): Promise<void> {
        if (this.context) {
            this.context = await getContextFromURI(this._uri)
            if (this.context.hrp != this._hrp) {
                throw new Error(`The HRP of the node's network is ${this.context.hrp} but expected to be ${this._hrp}`)
            }
        }
    }

    async getPChainId(): Promise<number> {
        await this._initContext()
        return this.context.networkID
    }

    async getCBlockchainId(): Promise<string> {
        await this._initContext()
        return this.context.cBlockchainID
    }

    async getPBlockchainId(): Promise<string> {
        await this._initContext()
        return this.context.pBlockchainID
    }

    async getAssetId(): Promise<string> {
        await this._initContext()
        return this.context.avaxAssetID
    }

    async getBaseTxFee(): Promise<bigint> {
        await this._initContext()
        return this.context.baseTxFee
    }

}