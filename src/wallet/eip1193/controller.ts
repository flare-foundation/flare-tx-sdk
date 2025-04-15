import { EIP1193Wallet } from "./wallet";
import { EIP1193Based, EIP1193Core } from "./core";
import { EIP1193Provider } from "./provider";

export type OnWalletChange = (wallet: EIP1193Wallet) => void

export class EIP1193WalletController extends EIP1193Based {

    constructor(provider: EIP1193Provider) {
        let core = new EIP1193Core(provider);
        super(core)
        this._onWalletChange = null
        this._wallets = {};
        core.setAccountChangedListener((account: string): void => {
            if (this._onWalletChange) {
                this._onWalletChange(this._getWallet(account))
            }
        })
    }

    protected _onWalletChange: OnWalletChange | null
    protected _wallets: { [id: string]: EIP1193Wallet }
    
    async getWallets(): Promise<Array<EIP1193Wallet>> {
        let accounts = await this._core.getAccounts()
        this._updateWallets(accounts)
        return accounts.map(a => this._wallets[a])
    }

    async getActiveWallet(): Promise<EIP1193Wallet | null> {
        let account = await this._core.getActiveAccount()
        this._updateWallets([account])
        return this._wallets[account]
    }

    onWalletChange(listener: OnWalletChange | null): void {
        this._onWalletChange = listener
    }

    protected _getWallet(account: string): EIP1193Wallet {
        this._updateWallets([account])
        return this._wallets[account]
    }

    protected _updateWallets(addresses: Array<string>): void {
        for (let address of addresses) {
            if (!(address in this._wallets)) {
                let wallet = new EIP1193Wallet(this._core, address)
                this._wallets[address] = wallet
            }
        }
    }

}