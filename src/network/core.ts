import Avalanche from "@flarenetwork/flarejs"
import { JsonRpcProvider } from "ethers";
import { AfterTxConfirmationCallback, AfterTxSubmissionCallback, BeforeTxSignatureCallback, BeforeTxSubmissionCallback } from "./callback"
import { Defaults, HRPToNetworkID } from "@flarenetwork/flarejs/dist/utils"
import { Constants } from "./constants";

export class NetworkCore {

    constructor(constants: Constants) {
        this.const = constants.copy()
        this.pChainId = HRPToNetworkID[constants.hrp as keyof object]
        this.cChainId = Defaults.network[this.pChainId].C.chainID!
        this.cBlockchainId = this._getCBlockchainId()
        this.pBlockchainId = this._getPBlockchainId()
        this.cAssetId = this._getCAssetId()
        this.pAssetId = this._getPAssetId()
        this.avalanche = this._getAvalanche(constants.rpc)
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
    avalanche: Avalanche
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
        this.avalanche = this._getAvalanche(rpc)
        this.ethers = this._getEthers(rpc)
    }

    private _getAvalanche(rpc: string): Avalanche {
        let url = new URL(rpc)
        let avalanche = new Avalanche(
            url.hostname,
            url.port ? parseInt(url.port) : undefined,
            url.protocol,
            this.pChainId
        )
        return avalanche
    }

    private _getEthers(rpc: string): JsonRpcProvider {
        return new JsonRpcProvider(rpc)
    }

    private _getCBlockchainId(): string {
        return Defaults.network[this.pChainId].C.blockchainID
    }

    private _getPBlockchainId(): string {
        return Defaults.network[this.pChainId].P.blockchainID
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