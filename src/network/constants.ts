export type KeyOfType<Type, ValueType> = keyof {
    [Key in keyof Type as Type[Key] extends ValueType ? Key : never]: any;
};


/**
 * Network constants.
 */
export class Constants {

    constructor() {
        this._setCommon()
    }

    /**
     * Network id
     */
    hrp: string

    /**
     * The RPC address of the node for network connection
     */
    rpc: string

    /**
     * Time in milliseconds after transaction submission before
     * error is thrown if the transaction is not confirmed
     */
    txConfirmationTimeout: number

    /**
     * Time in milliseconds that determines the delay between two
     * consecutive checks if a transaction is confirmed
     */
    txConfirmationCheckout: number

    /**
     * The gas limit used in EVM transfers
     */
    evmTransferGasLimit: bigint

    /**
     * The percentage of estimated gas limit to specify as extra in C-chain transactions
     * (does not apply to EVM transfers)
     */
    evmGasLimitExtra: number

    /**
     * The default base fee in weis used as fallback for C-chain transactions
     */
    evmBaseFee: bigint

    /**
     * The default max fee per gas in weis used as fallback for C-chain transactions
     */
    evmMaxFeePerGas: bigint

    /**
     * The default max priority fee per gas in weis used as fallback for C-chain transactions
     */
    evmMaxPriorityFeePerGas: bigint

    /**
     * The address of the FlareContractRegistry contract
     */
    address_FlareContractRegistry: string


    copy(): Constants {
        return Constants.fromJson(this.toJson())
    }

    toJson(): string {
        return JSON.stringify(this, (_, value) =>
            typeof value === 'bigint' ? value.toString() : value
        )
    }

    static fromJson(json: string): Constants {
        let constants = JSON.parse(json) as Constants
        let dummy = new Constants()
        for (let t in constants) {
            if (typeof dummy[t] === "bigint") {
                constants[t] = BigInt(constants[t])
            }
        }
        return constants
    }


    /**
     * Default constants for the main Flare network.
     */
    static readonly FLARE = this._flare()

    /**
     * Prepares default constants for the main Flare network.
     * @returns Constants of class {@link Constants}.
     */
    protected static _flare(): Constants {
        let constants = new Constants()
        constants.hrp = "flare"
        constants.rpc = "https://flare-api.flare.network/ext/bc/C/rpc"
        return constants
    }

    /**
     * Default constants for the canary Flare network.
     */
    static readonly SONGBIRD = this._songbird()

    /**
     * Prepares default constants for the canary Flare network.
     * @returns Constants of class {@link Constants}.
     */
    protected static _songbird(): Constants {
        let constants = new Constants()
        constants.hrp = "songbird"
        constants.rpc = "https://songbird-api.flare.network/ext/bc/C/rpc"
        return constants
    }

    /**
     * Default constants for the canary Flare network.
     */
    static readonly COSTON2 = this._coston2()

    /**
     * Prepares default constants for the test Flare network.
     * @returns Constants of class {@link Constants}.
     */
    protected static _coston2(): Constants {
        let constants = new Constants()
        constants.hrp = "costwo"
        constants.rpc = "https://coston2-api.flare.network/ext/bc/C/rpc"
        return constants
    }

    /**
     * Default constants for the test canary Flare network.
     */
    static readonly COSTON = this._coston()

    /**
     * Prepares default constants for the test canary Flare network.
     * @returns Constants of class {@link Constants}.
     */
    protected static _coston(): Constants {
        let constants = new Constants()
        constants.hrp = "coston"
        constants.rpc = "https://coston-api.flare.network/ext/bc/C/rpc"
        return constants
    }

    protected _setCommon(): void {
        this.txConfirmationTimeout = 60000
        this.txConfirmationCheckout = 2000
        this.evmTransferGasLimit = BigInt(21000)
        this.evmGasLimitExtra = 0.05
        this.evmBaseFee = BigInt(25 * 1e9)
        this.evmMaxFeePerGas = BigInt(50 * 1e9)
        this.evmMaxPriorityFeePerGas = BigInt(0)
        this.address_FlareContractRegistry = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019"
    }

}