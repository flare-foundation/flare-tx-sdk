import { JsonRpcProvider } from "ethers";
import { AfterTxConfirmationCallback, AfterTxSubmissionCallback, BeforeTxSignatureCallback, BeforeTxSubmissionCallback } from "./callback"
import { Constants } from "./constants";
import { Flarejs } from "./flarejs";

export class NetworkCore {

    constructor(constants: Constants) {
        this.const = constants.copy()
        // this.pChainId = HRPToNetworkID[constants.hrp as keyof object]
        // this.cChainId = Defaults.network[this.pChainId].C.chainID!
        // this.cAssetId = this._getCAssetId()
        // this.pAssetId = this._getPAssetId()
        this.flarejs = this._getFlarejs(constants.rpc)
        this.ethers = this._getEthers(constants.rpc)
        this.beforeTxSignature = null
        this.beforeTxSubmission = null
        this.afterTxSubmission = null
        this.afterTxConfirmation = null
    }

    private _cChainId: number

    const: Constants
    // cAssetId: string
    // pAssetId: string
    flarejs: Flarejs
    ethers: JsonRpcProvider
    beforeTxSignature: BeforeTxSignatureCallback
    beforeTxSubmission: BeforeTxSubmissionCallback
    afterTxSubmission: AfterTxSubmissionCallback
    afterTxConfirmation: AfterTxConfirmationCallback

    get hrp(): string {
        return this.const.hrp
    }

    get rpc(): string {
        return this.const.rpc
    }

    set rpc(rpc: string) {
        this.const.rpc = rpc
        this.flarejs = this._getFlarejs(rpc)
        this.ethers = this._getEthers(this.const.rpc)
    }

    private _getFlarejs(rpc: string): Flarejs {        
        return new Flarejs(rpc, this.const.hrp)
    }

    private _getEthers(rpc: string): JsonRpcProvider {
        return new JsonRpcProvider(rpc)
    }

    async getCChainId(): Promise<number> {
        if (!this._cChainId) {
            let network = await this.ethers.getNetwork()
            this._cChainId = Number(network.chainId)
        }
        return this._cChainId
    }

    async getPChainId(): Promise<number> {
        return this.flarejs.getPChainId()
    }

    /*
    private _getCAssetId(): string {
        return Defaults.network[this.pChainId].C.avaxAssetID!
    }

    private _getPAssetId(): string {
        return Defaults.network[this.pChainId].P.avaxAssetID!
    }
    */
}

export abstract class NetworkBased {
    
    constructor(core: NetworkCore) {
        this._core = core
    }

    protected _core: NetworkCore

}