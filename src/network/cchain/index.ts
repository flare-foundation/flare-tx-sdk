import { Account } from "../account"
import { FtsoDelegate } from "../balance"
import { FlareContract } from "../contract"
import { NetworkCore, NetworkBased } from "../core"
import { Utils } from "../utils"
import { GenericContract } from "./contract/generic"
import { ContractRegistry } from "./contract/registry"
import { Transactions } from "./tx"

export class CChain extends NetworkBased {

    constructor(network: NetworkCore) {
        super(network)
        this._registry = this._registry = new ContractRegistry(network, network.const.address_FlareContractRegistry)
        this.tx = new Transactions(network, this._registry)
    }

    tx: Transactions

    private _registry: ContractRegistry

    async getBalance(cAddress: string): Promise<bigint> {
        let weiBalance = await this._core.ethers.getBalance(cAddress)
        return weiBalance
    }

    async getWrappedBalance(address: string): Promise<bigint> {
        let wnat = await this._registry.getWNat()
        return wnat.balanceOf(address)
    }

    async getBalanceNotImportedToC(pAddress: string): Promise<bigint> {
        let pBlockchainId = this._core.pBlockchainId
        let pAssetId = this._core.pAssetId
        let pAddressForC = `C-${pAddress}`
        let pAddressHex = Utils.removeHexPrefix(Account.pAddressToHex(pAddress))
        let response = await this._core.avalanche.CChain().getUTXOs(pAddressForC, pBlockchainId)
        let balance = response.utxos.getBalance([Buffer.from(pAddressHex, "hex")], pAssetId)
        return Utils.toBigint(balance) * BigInt(1e9)
    }

    async getFtsoDelegatesOf(cAddress: string): Promise<Array<FtsoDelegate>> {
        let wnat = await this._registry.getWNat()
        return wnat.delegatesOf(cAddress)
    }

    async verifyStakeParameters(
        amount: bigint, startTime: bigint, endTime: bigint
    ): Promise<void> {
        let stakeVerifier = await this._registry.getStakeVerifier()

        let minStakeAmount = await stakeVerifier.minStakeAmount()
        if (amount < minStakeAmount) {
            throw new Error(`The minimal staking amount is ${minStakeAmount} weis`)
        }

        let maxStakeAmount = await stakeVerifier.maxStakeAmount()
        if (amount > maxStakeAmount) {
            throw new Error(`The maximal staking amount is ${maxStakeAmount} weis`)
        }

        let minStakeDurationSeconds = await stakeVerifier.minStakeDurationSeconds()
        if (startTime + minStakeDurationSeconds > endTime) {
            throw new Error(`The minimal stake duration is ${minStakeDurationSeconds} seconds`)
        }

        let maxStakeDurationSeconds = await stakeVerifier.maxStakeDurationSeconds()
        if (startTime + maxStakeDurationSeconds < endTime) {
            throw new Error(`The maximal stake duration is ${maxStakeDurationSeconds} seconds`)
        }
    }

    async invokeContractCall(
        contract: string,
        abi: string,
        method: string,
        ...params: any[]
    ): Promise<any> {
        let address = Account.isCAddress(contract) ? contract : await this._registry.getAddress(contract)
        if (Utils.isZeroHex(address)) {
            throw new Error("Unidentifiable contract address")
        }
        let generic = new GenericContract(this._core, address)
        return generic.call(abi, method, ...params)
    }

    async getFlareContracts() : Promise<Array<FlareContract>> {
        return this._registry.getAllContracts()
    }

}