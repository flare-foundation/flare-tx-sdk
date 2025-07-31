import { Account } from "../account"
import { FtsoDelegate, FtsoRewardState, RNatAccountBalance, RNatProject, RNatProjectInfo, SafeSmartAccount, StakeLimits } from "../iotype"
import { FlareContract } from "../contract"
import { NetworkCore, NetworkBased } from "../core"
import { Utils } from "../utils"
import { GenericContract } from "./contract/generic"
import { ContractRegistry } from "./contract/registry"
import { Transactions } from "./tx"
import { utils as futils } from "@flarenetwork/flarejs"
import { SafeProxy as SafeProxy } from "./contract/safe_proxy"

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
        let pBlockchainId = await this._core.flarejs.getPBlockchainId()
        let assetId = await this._core.flarejs.getAssetId()
        let pAddressForC = `C-${pAddress}`
        let response = await this._core.flarejs.evmApi.getUTXOs({ addresses: [pAddressForC], sourceChain: pBlockchainId })
        let balance = BigInt(0)
        for (let utxo of response.utxos) {
            if (utxo.getAssetId() !== assetId) {
                continue
            }
            let out = utxo.output
            if (futils.isTransferOut(out)) {
                balance += out.amount()
            }
        }
        return balance * BigInt(1e9)
    }

    async getClaimableFlareDropReward(address: string): Promise<bigint> {
        let flaredrop = await this._registry.getFlareDropDistribution()
        let start = await flaredrop.nextClaimableMonth(address)
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

    async getStakeLimits(): Promise<StakeLimits> {
        let stakeVerifier = await this._registry.getStakeVerifier()
        let minStakeDuration = await stakeVerifier.minStakeDurationSeconds()
        let maxStakeDuration = await stakeVerifier.maxStakeDurationSeconds()
        let minStakeAmount = await stakeVerifier.minStakeAmount()
        let minStakeAmountDelegator = minStakeAmount
        let minStakeAmountValidator = minStakeAmount     
        let maxStakeAmount = await stakeVerifier.maxStakeAmount()
        return { minStakeDuration, maxStakeDuration, minStakeAmountDelegator, minStakeAmountValidator, maxStakeAmount }                
    }

    async getRNatProjects(): Promise<Array<RNatProject>> {
        let rnat = await this._registry.getRNat()
        return rnat.getProjectsBasicInfo()
    }

    async getRNatProjectInfo(projectId: number): Promise<RNatProjectInfo> {
        let rnat = await this._registry.getRNat()
        return rnat.getProjectInfo(projectId)
    }

    async getClaimableRNatReward(projectId: number, owner: string): Promise<bigint> {
        let rnat = await this._registry.getRNat()
        return rnat.getClaimableRewards(projectId, owner)
    }

    async getRNatAccount(owner: string): Promise<string> {
        let rnat = await this._registry.getRNat()
        return rnat.getRNatAccount(owner)
    }

    async getRNatAccountBalance(owner: string): Promise<RNatAccountBalance> {
        let rnat = await this._registry.getRNat()
        return rnat.getBalancesOf(owner)
    }

    async getSafeSmartAccountInfo(address: string): Promise<SafeSmartAccount> {
        let proxy = new SafeProxy(this._core, address)
        let owners = await proxy.getOwners()
        let threshold = await proxy.getThreshold()
        return { address, owners, threshold }
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