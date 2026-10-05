import { Account } from "../account";
import {
  type FtsoDelegate,
  type FtsoRewardState,
  type FoundationProposalInfo,
  type RNatAccountBalance,
  type RNatProject,
  type RNatProjectAndClaimableReward,
  type RNatProjectInfo,
  type SafeSmartAccount,
  type StakeLimits,
  FoundationProposalState,
  type FdcAttestationRequest,
  type FdcAttestation,
} from "../iotype";
import type { FlareContract } from "../contract";
import { type NetworkCore, NetworkBased } from "../core";
import { Utils } from "../utils";
import { GenericContract } from "./contract/generic";
import { ContractRegistry } from "./contract/registry";
import { Transactions } from "./tx";
import { utils as futils } from "@flarenetwork/flarejs";
import { SafeProxy } from "./contract/safe_proxy";
import { FdcDataAvailability } from "./fdc/data_availability";
import { AttestationType, AttestationTypes } from "./fdc/attestation_type";

export class CChain extends NetworkBased {
  constructor(network: NetworkCore) {
    super(network);
    this._registry = this._registry = new ContractRegistry(network, network.const.address_FlareContractRegistry);
    this.tx = new Transactions(network, this._registry);
  }

  tx: Transactions;

  private _registry: ContractRegistry;

  async getCurrentBlock(): Promise<number> {
    return this._core.ethers.getBlockNumber();
  }

  async getBalance(cAddress: string): Promise<bigint> {
    const weiBalance = await this._core.ethers.getBalance(cAddress);
    return weiBalance;
  }

  async getWrappedBalance(address: string): Promise<bigint> {
    const wnat = await this._registry.getWNat();
    return wnat.balanceOf(address);
  }

  async getBalanceNotImportedToC(pAddress: string): Promise<bigint> {
    const pBlockchainId = await this._core.flarejs.getPBlockchainId();
    const assetId = await this._core.flarejs.getAssetId();
    const pAddressForC = `C-${pAddress}`;
    const response = await this._core.flarejs.evmApi.getUTXOs({
      addresses: [pAddressForC],
      sourceChain: pBlockchainId,
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

  async getClaimableStakingReward(address: string): Promise<bigint> {
    const manager = await this._registry.getValidatorRewardManager();
    const state = await manager.getStateOfRewards(address);
    return state[0] - state[1];
  }

  async getClaimableFtsoReward(address: string): Promise<bigint> {
    const states = await this.getStateOfFtsoRewards(address);
    let rewardAmount = BigInt(0);
    for (const epochStates of states) {
      if (epochStates.length === 0) {
        continue;
      }
      if (epochStates.some((s) => !s.initialised)) {
        break;
      }
      rewardAmount += epochStates.reduce((v, s) => {
        return v + s.amount;
      }, BigInt(0));
    }
    return rewardAmount;
  }

  async getStateOfFtsoRewards(address: string): Promise<Array<Array<FtsoRewardState>>> {
    const manager = await this._registry.getRewardManager();
    return manager.getStateOfRewards(address);
  }

  async getFtsoDelegatesOf(cAddress: string): Promise<Array<FtsoDelegate>> {
    const wnat = await this._registry.getWNat();
    return wnat.delegatesOf(cAddress);
  }

  async getStakeLimits(): Promise<StakeLimits> {
    const stakeVerifier = await this._registry.getStakeVerifier();
    const minStakeDuration = await stakeVerifier.minStakeDurationSeconds();
    const maxStakeDuration = await stakeVerifier.maxStakeDurationSeconds();
    const minStakeAmount = await stakeVerifier.minStakeAmount();
    const minStakeAmountDelegator = minStakeAmount;
    const minStakeAmountValidator = minStakeAmount;
    const maxStakeAmount = await stakeVerifier.maxStakeAmount();
    return { minStakeDuration, maxStakeDuration, minStakeAmountDelegator, minStakeAmountValidator, maxStakeAmount };
  }

  async getRNatProjects(): Promise<Array<RNatProject>> {
    const rnat = await this._registry.getRNat();
    return rnat.getProjectsBasicInfo();
  }

  async getRNatProjectsAndClaimableRewards(owner: string): Promise<Array<RNatProjectAndClaimableReward>> {
    const rnat = await this._registry.getRNat();
    return rnat.getProjectsBasicInfoAndClaimableRewards(owner);
  }

  async getRNatProjectInfo(projectId: number): Promise<RNatProjectInfo> {
    const rnat = await this._registry.getRNat();
    return rnat.getProjectInfo(projectId);
  }

  async getClaimableRNatReward(projectId: number, owner: string): Promise<bigint> {
    const rnat = await this._registry.getRNat();
    return rnat.getClaimableRewards(projectId, owner);
  }

  async getRNatAccount(owner: string): Promise<string> {
    const rnat = await this._registry.getRNat();
    return rnat.getRNatAccount(owner);
  }

  async getRNatAccountBalance(owner: string): Promise<RNatAccountBalance> {
    const rnat = await this._registry.getRNat();
    return rnat.getBalancesOf(owner);
  }

  async getSafeSmartAccountInfo(address: string): Promise<SafeSmartAccount> {
    const proxy = new SafeProxy(this._core, address);
    const owners = await proxy.getOwners();
    const threshold = await proxy.getThreshold();
    return { address, owners, threshold };
  }

  async getFoundationProposalIds(): Promise<Array<bigint>> {
    const polling = await this._registry.getPollingFoundation();
    return polling.getProposalIds();
  }

  async getFoundationProposalInfo(proposalId: bigint): Promise<FoundationProposalInfo> {
    const polling = await this._registry.getPollingFoundation();
    const info = await polling.getProposalInfo(proposalId);
    info.state = await polling.getProposalState(proposalId);
    if (info.state !== FoundationProposalState.PENDING) {
      const votes = await polling.getProposalVotes(proposalId);
      info.votePowerFor = votes[0];
      info.votePowerAgainst = votes[1];
    }
    return info;
  }

  async getVotePowerForFoundationProposal(voter: string, proposalId: bigint): Promise<bigint> {
    const polling = await this._registry.getPollingFoundation();
    const info = await polling.getProposalInfo(proposalId);
    return polling.getVotes(voter, info.votePowerBlock);
  }

  async getVoteDelegateForFoundationProposal(delegator: string, proposalId: bigint): Promise<string> {
    const polling = await this._registry.getPollingFoundation();
    const info = await polling.getProposalInfo(proposalId);
    const vp = await this._registry.getGovernanceVotePower();
    return vp.getDelegateOfAt(delegator, info.votePowerBlock);
  }

  async getCurrentGovernanceVotePower(voter: string): Promise<bigint> {
    const vp = await this._registry.getGovernanceVotePower();
    return vp.getVotes(voter);
  }

  async getCurrentGovernanceVoteDelegate(delegator: string): Promise<string> {
    const vp = await this._registry.getGovernanceVotePower();
    return vp.getDelegateOfAtNow(delegator);
  }

  async hasCastVoteForFoundationProposal(voter: string, proposalId: bigint): Promise<boolean> {
    const polling = await this._registry.getPollingFoundation();
    return polling.hasVoted(proposalId, voter);
  }

  async isFdcVotingRoundFinalized(votingRoundId: number | null): Promise<boolean> {
    if (votingRoundId === null || votingRoundId === undefined) {
      throw new Error("The FDC attestation request was not submitted (voting round id is not defined)");
    }
    const relay = await this._registry.getRelay();
    return relay.isFinalized(200, votingRoundId);
  }

  async getFdcAttestation(request: FdcAttestationRequest): Promise<FdcAttestation> {
    const votingRoundFinalized = await this.isFdcVotingRoundFinalized(request.votingRoundId);
    if (!votingRoundFinalized) {
      throw new Error("FDC voting round not finalized");
    }
    const da = new FdcDataAvailability(this._core);
    const attestation = await da.getAttestation(request.data, request.votingRoundId);
    return attestation;
  }

  async verifyFdcAttestation(attestation: FdcAttestation): Promise<boolean> {
    const verification = await this._registry.getFdcVerification();
    const type = AttestationTypes.getType(attestation.response.attestationType);
    if (type === AttestationType.EVM_TRANSACTION) {
      return verification.verifyEVMTransaction(attestation);
    } else if (type === AttestationType.PAYMENT) {
      return verification.verifyPayment(attestation);
    } else if (type === AttestationType.ADDRESS_VALIDITY) {
      return verification.verifyAddressValidity(attestation);
    } else if (type === AttestationType.WEB2JSON) {
      return verification.verifyWeb2Json(attestation);
    }
    throw new Error("Unsupported attestation type");
  }

  async invokeContractCall(contract: string, abi: string, method: string, ...params: any[]): Promise<any> {
    const address = Account.isCAddress(contract) ? contract : await this._registry.getAddress(contract);
    if (Utils.isZeroHex(address)) {
      throw new Error("Unidentifiable contract address");
    }
    const generic = new GenericContract(this._core, address);
    return generic.call(abi, method, ...params);
  }

  async getFlareContracts(): Promise<Array<FlareContract>> {
    return this._registry.getAllContracts();
  }
}
