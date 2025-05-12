import { FlrApp, EthApp } from "./signer";
import { EthLedgerWallet, FlrLedgerWallet, LedgerWallet } from "./wallet";
import { LedgerCore } from "./core";

/**
 * The class that controls SDK-compatible wallets representing Ledger accounts.
 */
export class LedgerWalletController {

    /**
     * The constructor of the controller.
     * @param flrApp Object of class {@link FlrApp}.
     * @param ethApp Object of class {@link EthApp}.
     * @remark At least one of the input parameters must be different than null.
     */
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

    /**
     * Returns the SDK-compatible wallet corresponding to the account
     * determined by the given derivation path.
     * @param bip44Path The string representing a BIP-44 derivation path.
     * @param app The string specifying the app the wallet should be compatible with (optional).
     * @returns An object of class {@link LedgerWallet}.
     */
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

    /**
     * Returns the currently active app on the connected Ledger device.
     * @returns A string representing the app name.
     */
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