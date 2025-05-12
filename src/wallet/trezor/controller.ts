import { TrezorConnector } from './connector';
import { TrezorWallet } from './wallet';

/**
 * The class that controls SDK-compatible wallets representing Trezor accounts.
 */
export class TrezorWalletController {

    /**
     * The constructor of the controller.
     * @param connector The connector object of class {@link TrezorConnector}.
     */
    constructor(connector: TrezorConnector) {
        this._connector = connector
        this._wallets = {}
    }

    protected _connector: TrezorConnector
    protected _wallets: { [path: string]: TrezorWallet }

    /**
     * Returns the SDK-compatible wallet corresponding to the account
     * determined by the given derivation path.
     * @param bip44Path The string representing a BIP-44 derivation path.
     * @returns An object of class {@link TrezorWallet}.
     */
    getWallet(bip44Path: string): TrezorWallet {
        if (!(bip44Path in this._wallets)) {
            this._wallets[bip44Path] = new TrezorWallet(this._connector, bip44Path)
        }
        return this._wallets[bip44Path]
    }
    
}