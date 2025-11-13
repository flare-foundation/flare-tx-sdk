import { Context, evm, pvm, info } from "@flarenetwork/flarejs"
import { FeeState } from "@flarenetwork/flarejs/dist/vms/pvm"

export class Flarejs {

    constructor(rpc: string, hrp: string) {
        this._uri = new URL(rpc).origin
        this._hrp = hrp
        this.infoApi = new info.InfoApi(this._uri)
        this.evm = evm
        this.evmApi = new evm.EVMApi(this._uri)
        this.pvm = pvm
        this.pvmApi = new pvm.PVMApi(this._uri)
    }

    private _uri: string
    private _hrp: string

    private _context: Context.Context

    infoApi: info.InfoApi

    evm: typeof evm
    evmApi: evm.EVMApi

    pvm: typeof pvm
    pvmApi: pvm.PVMApi

    private async _initContext(): Promise<void> {
        if (this._context === undefined) {
            this._context = await Context.getContextFromURI(this._uri)
            if (this._context.hrp !== this._hrp) {
                throw new Error(`The HRP of the node's network is ${this._context.hrp} but expected to be ${this._hrp}`)
            }
        }
    }

    async getContext(): Promise<Context.Context> {
        await this._initContext()
        return this._context
    }

    async getPChainId(): Promise<number> {
        await this._initContext()
        return this._context.networkID
    }

    async getCBlockchainId(): Promise<string> {
        await this._initContext()
        return this._context.cBlockchainID
    }

    async getPBlockchainId(): Promise<string> {
        await this._initContext()
        return this._context.pBlockchainID
    }

    async getAssetId(): Promise<string> {
        await this._initContext()
        return this._context.avaxAssetID
    }

    async getBaseTxFee(): Promise<bigint> {
        if (await this.isEtnaForkActive()) {
            let feeState = await this.pvmApi.getFeeState()
            return feeState.price * BigInt(1e9)
        } else {
            await this._initContext()
            return this._context.baseTxFee * BigInt(1e9)
        }
    }

    async getFeeState(extraRel?: number): Promise<FeeState> {
        let feeState = await this.pvmApi.getFeeState()
        if (extraRel) {
            feeState.price = BigInt(Math.ceil(Number(feeState.price) * (1 + extraRel)))
        }
        return feeState
    }

    async isEtnaForkActive(): Promise<boolean> {
        let { etnaTime } = await this.infoApi.getUpgradesInfo();
        return new Date() > new Date(etnaTime)
    }

}