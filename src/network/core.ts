import { JsonRpcProvider } from "ethers";
import { AfterTxConfirmationCallback, AfterTxSubmissionCallback, BeforeTxSignatureCallback, BeforeTxSubmissionCallback } from "./callback"
import { Defaults, HRPToNetworkID } from "@flarenetwork/flarejs/dist/utils"
import { Constants } from "./constants";
import { Flarejs } from "./flarejs";

export class NetworkCore {

    constructor(constants: Constants) {
        this.const = constants.copy()
        this.pChainId = HRPToNetworkID[constants.hrp as keyof object]
        this.cChainId = Defaults.network[this.pChainId].C.chainID!
        this.cAssetId = this._getCAssetId()
        this.pAssetId = this._getPAssetId()
        this.flarejs = this._getFlarejs(constants.rpc)
        this.ethers = this._getEthers(constants.rpc)
        this.beforeTxSignature = null
        this.beforeTxSubmission = null
        this.afterTxSubmission = null
    }

    const: Constants
    cChainId: number
    pChainId: number
    cBlockchainId: string
    pBlockchainId: string
    cAssetId: string
    pAssetId: string
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
        return new Flarejs(rpc)
    }

    private _getEthers(rpc: string): JsonRpcProvider {
        return new JsonRpcProvider(rpc)
    }

    private _getCAssetId(): string {
        return Defaults.network[this.pChainId].C.avaxAssetID!
    }

    private _getPAssetId(): string {
        return Defaults.network[this.pChainId].P.avaxAssetID!
    }
}

export abstract class NetworkBased {
    
    constructor(core: NetworkCore) {
        this._core = core
    }

    protected _core: NetworkCore

}