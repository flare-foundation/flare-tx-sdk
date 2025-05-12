import { EIP1193Wallet } from "./wallet";
import { EIP1193Based, EIP1193Core } from "./core";
import { EIP1193Provider } from "./provider";

export type OnWalletChange = (wallet: EIP1193Wallet) => void

/**
 * The class that controls SDK-compatible wallets representing EIP-1193 accounts.
 */
export class EIP1193WalletController extends EIP1193Based {

    /**
     * The constructor of the controller.
     * @param provider Provider object of class {@link EIP1193Provider}.
     */
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
    
    /**
     * Returns SDK-compatible wallets for all available accounts.
     * @returns An array of objects of class {@link EIP1193Wallet}.
     */
    async getWallets(): Promise<Array<EIP1193Wallet>> {
        let accounts = await this._core.getAccounts()
        this._updateWallets(accounts)
        return accounts.map(a => this._wallets[a])
    }

    /**
     * Returns the SDK-compatible wallet corresponding to the currently active account.
     * @returns Returns an object of class {@link EIP1193Wallet} or null.
     */
    async getActiveWallet(): Promise<EIP1193Wallet | null> {
        let account = await this._core.getActiveAccount()
        this._updateWallets([account])
        return this._wallets[account]
    }

    /**
     * Registers a listener that is called whenever the active account is changed.
     * @param listener A void function that receives an object of class {@link EIP1193Wallet} as input.
     * @remark The object received by `listener` is the wallet corresponding to the new active account.
     * @remark If `listener` is null, the previous listener is unregistered.
     */
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