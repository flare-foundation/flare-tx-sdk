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
        if (!this._accounts) {
            let result = await this._provider.request({
                method: "eth_requestAccounts",
                params: []
            })
            this._accounts = result as Array<string>
            this._provider.on("accountsChanged", accounts => {
                let previousAccount = this._getFirstAccountOrNull()
                this._accounts = accounts as Array<string>
                let currentAccount = this._getFirstAccountOrNull()
                if (previousAccount === null || !this._equalHex(previousAccount, currentAccount)) {
                    this._onAccountChange(currentAccount)
                }
            })
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