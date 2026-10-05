import { type Stake, type StakeLimits, StakeType } from "../iotype";
import { type NetworkCore, NetworkBased } from "../core";
import { Transactions } from "./tx";
import { type OutputOwners, pvmSerial, utils as futils } from "@flarenetwork/flarejs";
import { Amount } from "../amount";

export class PChain extends NetworkBased {
  constructor(network: NetworkCore) {
    super(network);
    this.tx = new Transactions(network);
  }

  tx: Transactions;

  async getBalance(pAddress: string): Promise<bigint> {
    const response = await this._core.flarejs.pvmApi.getBalance({ addresses: [`P-${pAddress}`] });
    return response.balance * BigInt(1e9);
  }

  async getBalanceNotImportedToP(pAddress: string): Promise<bigint> {
    const cBlockchainId = await this._core.flarejs.getCBlockchainId();
    const assetId = await this._core.flarejs.getAssetId();
    const pAddressForP = `P-${pAddress}`;
    const response = await this._core.flarejs.pvmApi.getUTXOs({
      addresses: [pAddressForP],
      sourceChain: cBlockchainId,
    });
    let balance = BigInt(0);
    for (const utxo of response.utxos) {
      if (utxo.getAssetId() !== assetId) {
        continue;
      }
      const out = utxo.output;
      if (futils.isTransferOut(out)) {
        balance += out.amount();
      }
    }
    return balance * BigInt(1e9);
  }

  async getStakedBalance(pAddress: string): Promise<bigint> {
    const response = await this._core.flarejs.pvmApi.getStake({ addresses: [`P-${pAddress}`] });
    return BigInt(response.staked) * BigInt(1e9);
  }

  async getStakes(nodeId?: string): Promise<Array<Stake>> {
    return this._getCurrentStakes(true, nodeId);
  }

  async getStakesOf(pAddress: string): Promise<Array<Stake>> {
    const stakes = await this._getCurrentStakes(true);
    return stakes.filter((s) => s.pAddress === pAddress);
  }

  async getValidators(): Promise<Array<Stake>> {
    return this._getCurrentStakes(false);
  }

  async getStakeLimits(): Promise<StakeLimits> {
    const minStake = await this._core.flarejs.pvmApi.getMinStake();
    const minStakeDuration = undefined;
    const maxStakeDuration = undefined;
    const minStakeAmountDelegator = BigInt(minStake.minDelegatorStake) * BigInt(1e9);
    const minStakeAmountValidator = BigInt(minStake.minValidatorStake) * BigInt(1e9);
    const maxStakeAmount = undefined;
    return { minStakeDuration, maxStakeDuration, minStakeAmountDelegator, minStakeAmountValidator, maxStakeAmount };
  }

  async getMinDelegatorStake(): Promise<bigint> {
    const minStake = await this._core.flarejs.pvmApi.getMinStake();
    return BigInt(minStake.minDelegatorStake) * BigInt(1e9);
  }

  async getMinValidatorStake(): Promise<bigint> {
    const minStake = await this._core.flarejs.pvmApi.getMinStake();
    return BigInt(minStake.minValidatorStake) * BigInt(1e9);
  }

  private async _getCurrentStakes(includeDelegators: boolean, nodeId?: string): Promise<Array<Stake>> {
    const stakes: Stake[] = [];
    const data = await this._core.flarejs.pvmApi.getCurrentValidators(nodeId ? { nodeIDs: [nodeId] } : undefined);
    for (const validator of data.validators) {
      stakes.push(await this._parseStake(validator, StakeType.VALIDATOR));
      if (!includeDelegators) {
        continue;
      }
      let delegators = validator.delegators;
      if (!nodeId && (!delegators || delegators.length === 0) && Number(validator.delegatorCount) > 0) {
        const extra = await this._core.flarejs.pvmApi.getCurrentValidators({ nodeIDs: [validator.nodeID] });
        delegators = extra.validators[0].delegators;
      }
      if (delegators) {
        for (const delegator of delegators) {
          stakes.push(await this._parseStake(delegator, StakeType.DELEGATOR));
        }
      }
    }
    return stakes;
  }

  private async _parseStake(stake: any, type: StakeType): Promise<Stake> {
    const txId = stake.txID as string;
    let pAddress: string;
    const rewardOwner = stake.validationRewardOwner ?? stake.delegationRewardOwner ?? stake.rewardOwner;
    if (rewardOwner?.addresses && rewardOwner.addresses.length > 0) {
      pAddress = rewardOwner.addresses[0];
      if (pAddress.startsWith("P-")) {
        pAddress = pAddress.slice(2);
      }
    } else {
      const tx = await this.tx.getStakeTx(txId);
      let owners: OutputOwners;
      if (tx instanceof pvmSerial.AddDelegatorTx || tx instanceof pvmSerial.AddValidatorTx) {
        owners = tx.getRewardsOwner();
      } else if (tx instanceof pvmSerial.AddPermissionlessDelegatorTx) {
        owners = tx.getDelegatorRewardsOwner();
      } else if (tx instanceof pvmSerial.AddPermissionlessValidatorTx) {
        owners = tx.getValidatorRewardsOwner();
      }
      pAddress = owners.addrs[0].toString(this._core.hrp);
    }
    const nodeId = stake.nodeID;
    const startTime = BigInt(stake.startTime);
    const endTime = BigInt(stake.endTime);
    const amount = BigInt(stake.weight) * BigInt(1e9);
    const delegationFee = stake.delegationFee ? Amount.percentages(stake.delegationFee) : undefined;
    return { txId, type, pAddress, nodeId, startTime, endTime, amount, delegationFee };
  }
}
