import { Account } from "../account";
import { Stake } from "../iotype";
import { NetworkCore, NetworkBased } from "../core";
import { Utils } from "../utils";
import { Transactions } from "./tx";

export class PChain extends NetworkBased {

    constructor(network: NetworkCore) {
        super(network)
        this.tx = new Transactions(network)
    }

    tx: Transactions
    
    async getBalance(pAddress: string): Promise<bigint> {
        let response = await this._core.avalanche.PChain().getBalance(`P-${pAddress}`)
        // let pAssetId = this._core.pAssetId
        // let pAddressHex = Utils.removeHexPrefix(Account.pAddressToHex(pAddress))
        // let utxoSet = await this._core.avalanche.PChain().getUTXOs([`P-${pAddress}`])
        // let balance = utxoSet.utxos.getBalance([Buffer.from(pAddressHex, "hex") as any], pAssetId)
        return Utils.toBigint(response.balance) * BigInt(1e9)
    }
    
    async getBalanceNotImportedToP(pAddress: string): Promise<bigint> {
        let cBlockchainId = this._core.cBlockchainId
        let pAssetId = this._core.pAssetId
        let pAddressForP = `P-${pAddress}`
        let pAddressHex = Utils.removeHexPrefix(Account.pAddressToHex(pAddress))
        let response = await this._core.avalanche.PChain().getUTXOs(pAddressForP, cBlockchainId)
        let balance = response.utxos.getBalance([Buffer.from(pAddressHex, "hex") as any], pAssetId)
        return Utils.toBigint(balance) * BigInt(1e9)
    }
    
    async getStakedBalance(pAddress: string): Promise<bigint> {
        let response = await this._core.avalanche.PChain().getStake([`P-${pAddress}`])
        return Utils.toBigint(response.staked) * BigInt(1e9)
    }

    async getStakes(): Promise<Array<Stake>> {
        let stakes = Array<Stake>()
        stakes = stakes.concat(await this._getCurrentStakes())
        stakes = stakes.concat(await this._getPendingStakes())
        return stakes
    }

    async getStakesOf(pAddress: string): Promise<Array<Stake>> {
        let stakes = await this.getStakes()
        return stakes.filter(s => s.pAddress === pAddress)
    }
    
    private async _getCurrentStakes(): Promise<Array<Stake>> {
        let stakes = Array<Stake>()
        let data = await this._core.avalanche.PChain().getCurrentValidators()
        let validators = (data as any).validators as Array<any>    
        for (let validator of validators) {
            stakes.push(await this._parseStake(validator, "validator"))
            let delegators = validator.delegators as Array<any>
            if (delegators) {
                for (let delegator of delegators) {
                    stakes.push(await this._parseStake(delegator, "delegator"))
                }
            }
        }
        return stakes
    }
    
    private async _getPendingStakes(): Promise<Array<Stake>> {
        let stakes = Array<Stake>()
        let data = await this._core.avalanche.PChain().getPendingValidators() as any
        let validators = data.validators as Array<any>
        for (let validator of validators) {
            stakes.push(await this._parseStake(validator, "validator"))
            let delegators = validator.delegators as Array<any>
            if (delegators) {
                for (let delegator of delegators) {
                    stakes.push(await this._parseStake(delegator, "delegator"))
                }
            }
        }
        let delegators = data.delegators as Array<any>
        for (let delegator of delegators) {
            stakes.push(await this._parseStake(delegator, "delegator"))
        }
        return stakes
    }
    
    private async _parseStake(stake: any, type: string): Promise<Stake> {
        let txId = stake.txID
        let pAddress: string
        if (stake.rewardOwner &&
            stake.rewardOwner.addresses &&
            stake.rewardOwner.addresses.length > 0) {
            pAddress = stake.rewardOwner.addresses[0]
            if (pAddress.startsWith("P-")) {
                pAddress = pAddress.slice(2)
            }
        } else {
            let tx = await this.tx.getStakeTx(txId)
            let addresses = tx.getRewardOwners().getOutput().getAddresses()
            pAddress = Account.pAddressToBech(addresses[0].toString("hex"), this._core.hrp)
        }
        let nodeId = stake.nodeID
        let startTime = BigInt(stake.startTime)
        let endTime = BigInt(stake.endTime)
        let amount = BigInt(stake.stakeAmount) * BigInt(1e9)
        let feePercentage = stake.delegationFee ? parseFloat(stake.delegationFee) : undefined
        return { txId, type, pAddress, nodeId, startTime, endTime, amount, feePercentage }
    }
    
}