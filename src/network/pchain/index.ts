import { Stake, StakeLimits, StakeType } from "../iotype";
import { NetworkCore, NetworkBased } from "../core";
import { Transactions } from "./tx";
import { OutputOwners, pvmSerial, utils as futils } from "@flarenetwork/flarejs";
import { Amount } from "../amount";

export class PChain extends NetworkBased {

    constructor(network: NetworkCore) {
        super(network)
        this.tx = new Transactions(network)
    }

    tx: Transactions

    async getBalance(pAddress: string): Promise<bigint> {
        let response = await this._core.flarejs.pvmApi.getBalance({ addresses: [`P-${pAddress}`] })
        return response.balance * BigInt(1e9)
    }

    async getBalanceNotImportedToP(pAddress: string): Promise<bigint> {
        let cBlockchainId = await this._core.flarejs.getCBlockchainId()
        let assetId = await this._core.flarejs.getAssetId()
        let pAddressForP = `P-${pAddress}`
        let response = await this._core.flarejs.pvmApi.getUTXOs({ addresses: [pAddressForP], sourceChain: cBlockchainId })
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

    async getStakedBalance(pAddress: string): Promise<bigint> {
        let response = await this._core.flarejs.pvmApi.getStake({ addresses: [`P-${pAddress}`] })
        return BigInt(response.staked) * BigInt(1e9)
    }

    async getStakes(nodeId?: string): Promise<Array<Stake>> {
        return this._getCurrentStakes(true, nodeId)
    }

    async getStakesOf(pAddress: string): Promise<Array<Stake>> {
        let stakes = await this._getCurrentStakes(true)
        return stakes.filter(s => s.pAddress === pAddress)
    }

    async getValidators(): Promise<Array<Stake>> {
        return this._getCurrentStakes(false)
    }

    async getStakeLimits(): Promise<StakeLimits> {
        let minStake = await this._core.flarejs.pvmApi.getMinStake()
        let minStakeDuration = undefined
        let maxStakeDuration = undefined
        let minStakeAmountDelegator = BigInt(minStake.minDelegatorStake) * BigInt(1e9)
        let minStakeAmountValidator = BigInt(minStake.minValidatorStake) * BigInt(1e9)
        let maxStakeAmount = undefined
        return { minStakeDuration, maxStakeDuration, minStakeAmountDelegator, minStakeAmountValidator, maxStakeAmount }
    }

    async getMinDelegatorStake(): Promise<bigint> {
        let minStake = await this._core.flarejs.pvmApi.getMinStake()
        return minStake.minDelegatorStake * BigInt(1e9)
    }

    async getMinValidatorStake(): Promise<bigint> {
        let minStake = await this._core.flarejs.pvmApi.getMinStake()
        return minStake.minValidatorStake * BigInt(1e9)
    }

    private async _getCurrentStakes(includeDelegators: boolean, nodeId?: string): Promise<Array<Stake>> {
        let stakes = Array<Stake>()
        let data = await this._core.flarejs.pvmApi.getCurrentValidators(nodeId ? { nodeIDs: [nodeId] } : undefined)
        for (let validator of data.validators) {
            stakes.push(await this._parseStake(validator, StakeType.VALIDATOR))
            if (!includeDelegators) {
                continue
            }
            let delegators = validator.delegators
            if (!nodeId && (!delegators || delegators.length == 0) && Number(validator.delegatorCount) > 0) {
                let extra = await this._core.flarejs.pvmApi.getCurrentValidators({ nodeIDs: [validator.nodeID] })
                delegators = extra.validators[0].delegators
            }
            if (delegators) {
                for (let delegator of delegators) {
                    stakes.push(await this._parseStake(delegator, StakeType.VALIDATOR))
                }
            }
        }
        return stakes
    }

    private async _parseStake(stake: any, type: StakeType): Promise<Stake> {
        let txId = stake.txID as string
        let pAddress: string
        let rewardOwner = stake.validationRewardOwner ?? stake.delegationRewardOwner
        if (rewardOwner &&
            rewardOwner.addresses &&
            rewardOwner.addresses.length > 0) {
            pAddress = rewardOwner.addresses[0]
            if (pAddress.startsWith("P-")) {
                pAddress = pAddress.slice(2)
            }
        } else {
            let tx = await this.tx.getStakeTx(txId)
            let owners: OutputOwners
            if (tx instanceof pvmSerial.AddDelegatorTx || tx instanceof pvmSerial.AddValidatorTx) {
                owners = tx.getRewardsOwner()
            } else if (tx instanceof pvmSerial.AddPermissionlessDelegatorTx) {
                owners = tx.getDelegatorRewardsOwner()
            } else if (tx instanceof pvmSerial.AddPermissionlessValidatorTx) {
                owners = tx.getValidatorRewardsOwner()
            }
            pAddress = owners.addrs[0].toString(this._core.hrp)
        }
        let nodeId = stake.nodeID
        let startTime = BigInt(stake.startTime)
        let endTime = BigInt(stake.endTime)
        let amount = BigInt(stake.stakeAmount) * BigInt(1e9)
        let delegationFee = stake.delegationFee ? Amount.percentages(stake.delegationFee) : undefined
        return { txId, type, pAddress, nodeId, startTime, endTime, amount, delegationFee }
    }

}