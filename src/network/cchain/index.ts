import { Account } from "../account"
import { FtsoDelegate, FtsoRewardState } from "../iotype"
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
        let response = await this._core.flarejs.CChain().getUTXOs(pAddressForC, pBlockchainId)
        let balance = response.utxos.getBalance([Buffer.from(pAddressHex, "hex")], pAssetId)
        return Utils.toBigint(balance) * BigInt(1e9)
    }

    async getClaimableFlareDropReward(address: string): Promise<bigint> {
        let flaredrop = await this._registry.getFlareDropDistribution()
        let start = await flaredrop.nextClaimableMonth(address)
        // let currentMonth = await flaredrop.getCurrentMonth()
        // let end = currentMonth // BigInt(Math.min(36, Number(currentMonth)))
        let startEndMonths = await flaredrop.getClaimableMonths()
        let end = startEndMonths[1]
        let amount = BigInt(0)
        for (let month = start; month <= end; month++) {
            amount += await flaredrop.getClaimableAmountOf(address, month)
        }
        return amount
    }

    async getClaimableStakingReward(address: string): Promise<bigint> {
        let manager = await this._registry.getValidatorRewardManager()
        let state = await manager.getStateOfRewards(address)
        return state[0] - state[1]
    }

    async getClaimableFtsoReward(address: string): Promise<bigint> {
        let states = await this.getStateOfFtsoRewards(address)
        let rewardAmount = BigInt(0)
        for (let epochStates of states) {
            if (epochStates.length == 0) {
                continue
            }
            if (epochStates.some(s => !s.initialised)) {
                break
            }
            rewardAmount += epochStates.reduce((v, s) => { return v + s.amount }, BigInt(0))
        }
        return rewardAmount
    }

    async getStateOfFtsoRewards(address: string): Promise<Array<Array<FtsoRewardState>>> {
        let manager = await this._registry.getRewardManager()
        return manager.getStateOfRewards(address)
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

    async getFlareContracts(): Promise<Array<FlareContract>> {
        return this._registry.getAllContracts()
    }

}