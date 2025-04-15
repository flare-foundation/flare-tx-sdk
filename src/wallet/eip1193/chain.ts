type NetworkId = {
    [key: string]: string
}

const CHAIN_ID: NetworkId = {
    flare: "0xe", // 14
    songbird: "0x13", // 19
    coston2: "0x72", // 114
    coston: "0x10", // 16
}

const CHAIN_NAME: NetworkId = {
    flare: "Flare Mainnet",
    songbird: "Songbird Canary Network",
    coston2: "Flare Testnet Coston2",
    coston: "Songbird Testnet Coston"
}

const RPC: NetworkId = {
    flare: "https://flare-api.flare.network/ext/bc/C/rpc",
    songbird: "https://songbird-api.flare.network/ext/bc/C/rpc",
    coston2: "https://coston2-api.flare.network/ext/bc/C/rpc",
    coston: "https://coston-api.flare.network/ext/bc/C/rpc"
}

const EXPLORER: NetworkId = {
    flare: "https://flare-explorer.flare.network/",
    songbird: "https://songbird-explorer.flare.network/",
    coston2: "https://coston2-explorer.flare.network/",
    coston: "https://coston-explorer.flare.network/"
}

const CURRENCY_DECIMALS = 18

const CURRENCY_NAME: NetworkId = {
    flare: "Flare",
    songbird: "Songbird",
    coston2: "Coston2 Flare",
    coston: "Coston Flare"
}

const CURRENCY_SYMBOL: NetworkId = {
    flare: "FLR",
    songbird: "SGB",
    coston2: "C2FLR",
    coston: "CFLR"
}

export type ChainData = {
    chainId: string,
    chainName: string,
    rpcUrls: Array<string>,
    blockExplorerUrls: Array<string>,
    nativeCurrency: CurrencyData
}

export type CurrencyData = {
    decimals: number,
    name: string,
    symbol: string
}

export class Chain {

    static getChainData(chainId: bigint): ChainData {
        let networkId = this._getNetworkId(chainId)
        return {
            chainId: CHAIN_ID[networkId],
            chainName: CHAIN_NAME[networkId],
            rpcUrls: [RPC[networkId]],
            blockExplorerUrls: [EXPLORER[networkId]],
            nativeCurrency: {
                decimals: CURRENCY_DECIMALS,
                name: CURRENCY_NAME[networkId],
                symbol: CURRENCY_SYMBOL[networkId]
            }
        }
    }

    private static _getNetworkId(chainId: bigint): string {
        let chainHex = `0x${chainId.toString(16)}`
        for (let key in CHAIN_ID) {
            if (CHAIN_ID[key] === chainHex) {
                return key
            }
        }
        throw new Error("Unknown network")
    }

}