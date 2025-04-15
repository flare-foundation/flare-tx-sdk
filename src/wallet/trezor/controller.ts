import { TrezorConnector } from './connector';
import { TrezorWallet } from './wallet';

export class TrezorWalletController {

    constructor(connector: TrezorConnector) {
        this._connector = connector
        this._wallets = {}
    }

    protected _connector: TrezorConnector
    protected _wallets: { [path: string]: TrezorWallet }

    getWallet(bip44Path: string) {
        if (!(bip44Path in this._wallets)) {
            this._wallets[bip44Path] = new TrezorWallet(this._connector, bip44Path)
        }
        return this._wallets[bip44Path]
    }
    
}