import { FlrApp, EthApp } from "./signer";
import { EthLedgerWallet, FlrLedgerWallet, LedgerWallet } from "./wallet";
import { LedgerCore } from "./core";

export class LedgerWalletController {

    constructor(flrApp?: FlrApp, ethApp?: EthApp) {
        if (!flrApp && !ethApp) {
            throw new Error("At least one ledger app connection should be provided")
        }
        this._core = new LedgerCore(flrApp ? flrApp.transport : ethApp.transport)
        this._flrApp = flrApp
        this._ethApp = ethApp
        this._wallets = {};
    }

    static readonly FLR_APP = LedgerCore.FLR
    static readonly ETH_APP = LedgerCore.ETH

    protected readonly _core: LedgerCore
    protected readonly _flrApp: FlrApp
    protected readonly _ethApp: EthApp

    protected _wallets: { [path: string]: { [signer: string]: LedgerWallet | null } }

    async getWallet(bip44Path: string, app?: string): Promise<LedgerWallet> {
        this._setupWallets(bip44Path)
        if (!app) {
            app = await this._core.getActiveApp()
        }
        if (app === LedgerCore.FLR || app === LedgerCore.ETH) {
            let wallet = this._wallets[bip44Path][app]
            if (!wallet) {
                throw new Error("Unsupported app")
            }
            return wallet
        }
        throw new Error("Unknown ledger app")
    }

    async getActiveApp(): Promise<string> {
        return this._core.getActiveApp()
    }

    protected _setupWallets(path: string): void {
        if (path in this._wallets) {
            return
        }
        this._wallets[path] = {}
        this._wallets[path][LedgerCore.FLR] = this._flrApp ?
            new FlrLedgerWallet(this._flrApp, path) : null
        this._wallets[path][LedgerCore.ETH] = this._ethApp ?
            new EthLedgerWallet(this._ethApp, path) : null
    }
    
}