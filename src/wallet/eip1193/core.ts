import { Chain } from "./chain"
import { EIP1193Provider as EIP1193Provider } from "./provider";

export type AccountChangedListener = (account: string) => void

export class EIP1193Core {

    constructor(provider: EIP1193Provider) {
        this._provider = provider
    }

    protected _provider: EIP1193Provider
    protected _onAccountChange: AccountChangedListener
    protected _accounts: Array<string>
    protected _accountsRequest: Promise<void>
    protected _listening: boolean

    setAccountChangedListener(listener: AccountChangedListener): void {
        this._onAccountChange = listener
    }

    async getAccounts(): Promise<Array<string>> {
        await this._updateAccounts()
        return this._accounts
    }

    async getActiveAccount(): Promise<string> {
        await this._updateAccounts()
        return this._getFirstAccountOrNull()
    }

    protected async _updateAccounts(): Promise<void> {
        if (this._accounts && this._accounts.length > 0) {
            return
        }
        // concurrent calls share a single pending request
        if (!this._accountsRequest) {
            this._accountsRequest = this._requestAccounts()
        }
        try {
            await this._accountsRequest
        } finally {
            this._accountsRequest = undefined
        }
    }

    protected async _requestAccounts(): Promise<void> {
        let result = await this._provider.request({
            method: "eth_requestAccounts",
            params: []
        })
        // the listener is not notified on the initial connection, only on reconnection
        this._setAccounts(result as Array<string>, this._accounts !== undefined)
        // registered after the initial connection, so that its accountsChanged event is not reported
        if (!this._listening) {
            this._listening = true
            this._provider.on("accountsChanged", accounts => {
                this._setAccounts(accounts as Array<string>, true)
            })
        }
    }

    protected _setAccounts(accounts: Array<string>, notify: boolean): void {
        let previousAccount = this._getFirstAccountOrNull()
        this._accounts = accounts ?? []
        let currentAccount = this._getFirstAccountOrNull()
        if (notify && this._onAccountChange && !this._equalHex(previousAccount, currentAccount)) {
            this._onAccountChange(currentAccount)
        }
    }

    protected _getFirstAccountOrNull(): string {
        return (!this._accounts || this._accounts.length == 0) ? null : this._accounts[0]
    }

    async switchChain(chainId: bigint): Promise<void> {        
        let chainData = Chain.getChainData(chainId)
        let ethChainRequest = {
            method: "eth_chainId",
            params: []
        }
        let currentChainId = await this._provider.request(ethChainRequest) as string
        if (this._equalHex(chainData.chainId, currentChainId)) {
            return
        }

        let addChainRequest = {
            method: "wallet_addEthereumChain",
            params: [chainData]
        }
        let switchChainRequest = {
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainData.chainId }]
        }
        await this._provider.request(addChainRequest)
        await this._provider.request(switchChainRequest)
    }

    async requestSignature(request: any, from: string): Promise<any> {
        let account = await this.getActiveAccount()
        if (account !== from) {
            throw new Error(`Rejected signature request for inactive account ${from}. Active account is ${account}.`)
        }
        return this._provider.request(request)
    }

    protected _equalHex(hex1: string, hex2: string): boolean {
        return this._normalizeHex(hex1) === this._normalizeHex(hex2)
    }

    protected _normalizeHex(hex: string): string {
        if (!hex) {
            return hex
        }
        if (!hex.startsWith("0x")) {
            hex = `0x${hex}`
        }
        return hex.toLowerCase()
    }
}

export abstract class EIP1193Based {

    constructor(core: EIP1193Core) {
        this._core = core
    }

    protected _core: EIP1193Core

}