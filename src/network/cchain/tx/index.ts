import { Export } from "./export";
import { Import } from "./import";
import { type NetworkCore, NetworkBased } from "../../core";
import { Account } from "../../account";
import { Signature } from "../../sign";
import { Utils } from "../../utils";
import { TxType } from "../../txtype";
import type { Wallet } from "../../../wallet";
import { ethers, Transaction as EvmTx, type TransactionReceipt } from "ethers";
import { type EVMUnsignedTx as AvaxTx, messageHashFromUnsignedTx, utils as futils } from "@flarenetwork/flarejs";
import type { ContractRegistry } from "../contract/registry";
import { GenericContract } from "../contract/generic";
import { Constants } from "../../constants";
import type {
  FtsoRewardClaimWithProof,
  FoundationProposalSupport,
  FdcSourceNetwork,
  FdcAttestationRequest,
} from "../../iotype";
import { SafeProxyFactory } from "../contract/safe_proxy_factory";
import { Evm } from "./evm";
import { FdcVerifiers } from "../fdc/verifiers";
import { QR } from "../../qrcode";

export class Transactions extends NetworkBased {
  constructor(network: NetworkCore, registry: ContractRegistry) {
    super(network);
    this._registry = registry;
    this._evm = new Evm(network);
    this._export = new Export(network);
    this._import = new Import(network);
  }

  private _registry: ContractRegistry;
  private _evm: Evm;
  private _export: Export;
  private _import: Import;

  async transfer(wallet: Wallet, cAddress: string, recipient: string, amount?: bigint): Promise<void> {
    const evm = new Evm(this._core);
    let gasLimit: bigint;
    const amountUndefined = amount === undefined || amount === null;
    if (wallet.smartAccount) {
      gasLimit = undefined;
      if (amountUndefined) {
        amount = await this._core.ethers.getBalance(wallet.smartAccount);
      }
    } else {
      gasLimit = this._core.const.evmTransferGasLimit;
    }
    const unsignedTx = await evm.getTx(cAddress, wallet.smartAccount, recipient, undefined, amount, gasLimit);
    if (!wallet.smartAccount && amountUndefined) {
      const balance = await this._core.ethers.getBalance(cAddress);
      amount = balance - gasLimit * unsignedTx.maxFeePerGas;
      if (amount < 0) {
        throw new Error("Balance too low to execute transfer");
      }
      unsignedTx.value = amount;
    }
    await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.TRANSFER_NAT);
  }

  async wrap(wallet: Wallet, cAddress: string, amount: bigint): Promise<void> {
    const wnat = await this._registry.getWNat();
    const data = wnat.wrap();
    const unsignedTx = await this._evm.getTx(cAddress, wallet.smartAccount, wnat.address, data, amount);
    await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.WRAP_NAT);
  }

  async unwrap(wallet: Wallet, cAddress: string, amount: bigint): Promise<void> {
    const wnat = await this._registry.getWNat();
    const data = wnat.withdraw(amount);
    const unsignedTx = await this._evm.getTx(cAddress, wallet.smartAccount, wnat.address, data);
    await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.UNWRAP_NAT);
  }

  async transferWrapped(wallet: Wallet, cAddress: string, recipient: string, amount: bigint): Promise<void> {
    const wnat = await this._registry.getWNat();
    const data = wnat.transfer(recipient, amount);
    const unsignedTx = await this._evm.getTx(cAddress, wallet.smartAccount, wnat.address, data);
    await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.TRANSFER_WNAT);
  }

  async claimStakingReward(
    wallet: Wallet,
    cAddress: string,
    rewardOwner: string,
    recipient: string,
    wrap: boolean
  ): Promise<void> {
    const manager = await this._registry.getValidatorRewardManager();
    const state = await manager.getStateOfRewards(rewardOwner);
    const rewardAmount = state[0] - state[1];
    const data = manager.claim(rewardOwner, recipient, rewardAmount, wrap);
    const unsignedTx = await this._evm.getTx(cAddress, wallet.smartAccount, manager.address, data);
    await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.CLAIM_REWARD_STAKING);
  }

  async claimFtsoReward(
    wallet: Wallet,
    cAddress: string,
    rewardOwner: string,
    recipient: string,
    wrap: boolean,
    proofs: Array<FtsoRewardClaimWithProof>
  ): Promise<void> {
    const manager = await this._registry.getRewardManager();
    let rewardEpochId: bigint;
    if (proofs.length === 0) {
      const states = await manager.getStateOfRewards(rewardOwner);
      rewardEpochId = BigInt(-1);
      for (const epochStates of states) {
        if (epochStates.length === 0) {
          continue;
        }
        if (epochStates.some((s) => !s.initialised)) {
          break;
        }
        rewardEpochId = epochStates[0].rewardEpochId;
      }
      if (rewardEpochId < BigInt(0)) {
        throw new Error("The reward owner has no claimable rewards in initialised reward epochs");
      }
    } else {
      rewardEpochId = proofs.reduce((v, p) => {
        const id = p.body.rewardEpochId;
        return id > v ? id : v;
      }, BigInt(0));
    }
    const data = manager.claim(rewardOwner, recipient, rewardEpochId, wrap, proofs);
    const unsignedTx = await this._evm.getTx(cAddress, wallet.smartAccount, manager.address, data);
    await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.CLAIM_REWARD_FTSO);
  }

  async delegateToFtso(
    wallet: Wallet,
    cAddress: string,
    delegates: Array<string>,
    sharesBP: Array<bigint>
  ): Promise<void> {
    const wnat = await this._registry.getWNat();
    if (this._core.hrp === Constants.SONGBIRD.hrp || this._core.hrp === Constants.COSTON.hrp) {
      const current = await wnat.delegatesOf(cAddress);
      if (current.length > 0) {
        await this.undelegateFromFtso(wallet, cAddress);
      }
      for (let i = 0; i < delegates.length; i++) {
        const data = wnat.delegate(delegates[i], sharesBP[i]);
        const unsignedTx = await this._evm.getTx(cAddress, wallet.smartAccount, wnat.address, data);
        await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.DELEGATE_FTSO);
      }
    } else {
      const data = wnat.batchDelegate(delegates, sharesBP);
      const unsignedTx = await this._evm.getTx(cAddress, wallet.smartAccount, wnat.address, data);
      await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.DELEGATE_FTSO);
    }
  }

  async undelegateFromFtso(wallet: Wallet, cAddress: string): Promise<void> {
    const wnat = await this._registry.getWNat();
    const data = wnat.undelegateAll();
    const unsignedTx = await this._evm.getTx(cAddress, wallet.smartAccount, wnat.address, data);
    await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.UNDELEGATE_FTSO);
  }

  async claimRNatReward(wallet: Wallet, cAddress: string, projectIds: Array<number>): Promise<void> {
    const rnat = await this._registry.getRNat();
    const month = await rnat.getCurrentMonth();
    const data = rnat.claimRewards(projectIds, month);
    const unsignedTx = await this._evm.getTx(cAddress, wallet.smartAccount, rnat.address, data);
    await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.CLAIM_REWARD_RNAT);
  }

  async withdrawFromRNatAccount(wallet: Wallet, cAddress: string, amount: bigint, wrap: boolean): Promise<void> {
    const rnat = await this._registry.getRNat();
    const data = rnat.withdraw(amount, wrap);
    const unsignedTx = await this._evm.getTx(cAddress, wallet.smartAccount, rnat.address, data);
    await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.WITHDRAW_RNAT);
  }

  async withdrawAllFromRNatAccount(wallet: Wallet, cAddress: string, wrap: boolean): Promise<void> {
    const rnat = await this._registry.getRNat();
    const data = rnat.withdrawAll(wrap);
    const unsignedTx = await this._evm.getTx(cAddress, wallet.smartAccount, rnat.address, data);
    await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.WITHDRAW_RNAT);
  }

  async createSafeSmartAccount(
    wallet: Wallet,
    cAddress: string,
    owners: Array<string>,
    threshold: bigint
  ): Promise<string> {
    const proxyFactory = new SafeProxyFactory(this._core, this._core.const.address_SafeProxyFactory);
    const singleton = this._core.const.address_SafeSingleton;
    const fallbackHandler = this._core.const.address_SafeFallbackHandler;
    const saltNonce = BigInt(ethers.hexlify(ethers.randomBytes(32)));
    const data = proxyFactory.createProxy(singleton, owners, threshold, fallbackHandler, saltNonce);
    const unsignedTx = await this._evm.getTx(cAddress, wallet.smartAccount, proxyFactory.address, data);
    const receipt = await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.CREATE_SAFE_SMART_ACCOUNT);
    if (!receipt) {
      return null;
    }
    const topic = ethers.id("ProxyCreation(address,address)");
    const log = receipt.logs.find(
      (l) => l.address.toLowerCase() === proxyFactory.address.toLowerCase() && l.topics[0] === topic
    );
    if (!log) {
      return null;
    }
    return ethers.getAddress(ethers.dataSlice(log.topics[1], 12));
  }

  async castVoteForFoundationProposal(
    wallet: Wallet,
    cAddress: string,
    proposalId: bigint,
    support: FoundationProposalSupport
  ): Promise<void> {
    const polling = await this._registry.getPollingFoundation();
    const data = polling.castVote(proposalId, support);
    const unsignedTx = await this._evm.getTx(cAddress, wallet.smartAccount, polling.address, data);
    await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.FOUNDATION_PROPOSAL_VOTE);
  }

  async delegateGovernanceVotePower(wallet: Wallet, cAddress: string, delegate: string): Promise<void> {
    const vp = await this._registry.getGovernanceVotePower();
    const data = vp.delegate(delegate);
    const unsignedTx = await this._evm.getTx(cAddress, wallet.smartAccount, vp.address, data);
    await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.DELEGATE_GOVERNANCE_VOTE_POWER);
  }

  async undelegateGovernanceVotePower(wallet: Wallet, cAddress: string): Promise<void> {
    const vp = await this._registry.getGovernanceVotePower();
    const data = vp.undelegate();
    const unsignedTx = await this._evm.getTx(cAddress, wallet.smartAccount, vp.address, data);
    await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.UNDELEGATE_GOVERNANCE_VOTE_POWER);
  }

  async submitFdcAttestationRequestForEvmTransaction(
    wallet: Wallet,
    cAddress: string,
    source: FdcSourceNetwork,
    txId: string
  ): Promise<FdcAttestationRequest> {
    const verifiers = new FdcVerifiers(this._core);
    const data = await verifiers.prepareEvmTransactionRequest(source, txId);
    const votingRoundId = await this._submitFdcAttestationRequest(wallet, cAddress, data);
    return { data, votingRoundId };
  }

  async submitFdcAttestationRequestForPayment(
    wallet: Wallet,
    cAddress: string,
    source: FdcSourceNetwork,
    txId: string,
    senderUtxo?: number | string,
    recipientUtxo?: number | string
  ): Promise<FdcAttestationRequest> {
    const verifiers = new FdcVerifiers(this._core);
    const data = await verifiers.preparePaymentRequest(source, txId, senderUtxo, recipientUtxo);
    const votingRoundId = await this._submitFdcAttestationRequest(wallet, cAddress, data);
    return { data, votingRoundId };
  }

  async submitFdcAttestationRequestForAddressValidity(
    wallet: Wallet,
    cAddress: string,
    source: FdcSourceNetwork,
    address: string
  ): Promise<FdcAttestationRequest> {
    const verifiers = new FdcVerifiers(this._core);
    const data = await verifiers.prepareAddressValidityRequest(source, address);
    const votingRoundId = await this._submitFdcAttestationRequest(wallet, cAddress, data);
    return { data, votingRoundId };
  }

  async submitFdcAttestationRequestForWeb2Json(
    wallet: Wallet,
    cAddress: string,
    url: string,
    httpMethod: string,
    headers: string,
    queryParams: string,
    body: string,
    postProcessJq: string,
    abiSignature: string
  ): Promise<FdcAttestationRequest> {
    const verifiers = new FdcVerifiers(this._core);
    const data = await verifiers.prepareWeb2JsonRequest(
      url,
      httpMethod,
      headers,
      queryParams,
      body,
      postProcessJq,
      abiSignature
    );
    const votingRoundId = await this._submitFdcAttestationRequest(wallet, cAddress, data);
    return { data, votingRoundId };
  }

  async _submitFdcAttestationRequest(wallet: Wallet, cAddress: string, request: string): Promise<number | null> {
    const hub = await this._registry.getFdcHub();
    const data = hub.requestAttestation(request);
    const conf = await this._registry.getFdcRequestFeeConfigurations();
    const fee = await conf.getRequestFee(request);
    const unsignedTx = await this._evm.getTx(cAddress, wallet.smartAccount, hub.address, data, fee);
    const receipt = await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.SUBMIT_ATTESTATION_REQUEST);
    // The request is submitted only if the hub emitted the event (e.g., not when a smart account only approved it).
    const topic = ethers.id("AttestationRequest(bytes,uint256)");
    const submitted = receipt?.logs.some(
      (l) => l.address.toLowerCase() === hub.address.toLowerCase() && l.topics[0] === topic
    );
    if (submitted) {
      const block = await receipt.getBlock();
      const fsm = await this._registry.getFlareSystemManager();
      const votingStart = Number(await fsm.firstVotingRoundStartTs());
      const votingEpochDuration = Number(await fsm.votingEpochDurationSeconds());
      return Math.floor((block.timestamp - votingStart) / votingEpochDuration);
    }
    return null;
  }

  async invokeContractMethod(
    wallet: Wallet,
    cAddress: string,
    contract: string,
    abi: string,
    method: string,
    value: bigint,
    ...params: any[]
  ): Promise<void> {
    const contractAddress = Account.isCAddress(contract) ? contract : await this._registry.getAddress(contract);
    if (Utils.isZeroHex(contractAddress)) {
      throw new Error("Unidentifiable contract address");
    }
    const generic = new GenericContract(this._core, contractAddress);
    const data = generic.getData(abi, method, ...params);
    const unsignedTx = await this._evm.getTx(cAddress, wallet.smartAccount, generic.address, data, value);
    await this._signAndSubmitEvmTx(wallet, cAddress, unsignedTx, TxType.CUSTOM_CONTRACT_C);
  }

  async exportFromC(wallet: Wallet, account: Account, amount: bigint, baseFee?: bigint): Promise<boolean> {
    baseFee = baseFee ?? (await this.getBaseFee());
    const unsignedTx = await this._export.getTx(account.cAddress, account.pAddress, amount, baseFee);
    return this._signAndSubmitAvaxTx(wallet, account, unsignedTx, TxType.EXPORT_C);
  }

  async importToC(wallet: Wallet, account: Account, baseFee?: bigint): Promise<boolean> {
    baseFee = baseFee ?? (await this.getBaseFee());
    const unsignedTx = await this._import.getTx(account.cAddress, account.pAddress, baseFee);
    return this._signAndSubmitAvaxTx(wallet, account, unsignedTx, TxType.IMPORT_C);
  }

  async getBaseFee(): Promise<bigint> {
    const feeData = await this._core.ethers.getFeeData();
    const gasPrice = feeData.gasPrice ?? this._core.const.evmBaseFee;
    const gwei = BigInt(1e9);
    const up = gasPrice % gwei === BigInt(0) ? BigInt(0) : BigInt(1);
    return (gasPrice / gwei + up) * gwei;
  }

  private async _signAndSubmitEvmTx(
    wallet: Wallet,
    cAddress: string,
    unsignedTx: EvmTx,
    txType: string
  ): Promise<TransactionReceipt | null> {
    const unsignedTxHex = unsignedTx.unsignedSerialized;

    if (this._core.beforeTxSignature) {
      const verificationQRCode = await QR.generateCodeForTxVerification(unsignedTxHex);
      const proceed = await this._core.beforeTxSignature({ txType, unsignedTxHex, verificationQRCode });
      if (!proceed) {
        return null;
      }
    }

    let txId: string;
    const submittedByWallet = !!wallet.signAndSubmitCTransaction;
    if (submittedByWallet) {
      txId = await wallet.signAndSubmitCTransaction(unsignedTxHex);
      if (!ethers.isHexString(txId) || ethers.dataLength(txId) !== 32) {
        throw new Error(`The function 'signAndSubmitCTransaction' returned an invalid transaction id (${txId})`);
      }
    } else {
      const digest = unsignedTx.unsignedHash;
      const signature = await Signature.signEvmTx(wallet, unsignedTxHex, digest, cAddress);

      const tx = EvmTx.from({ signature, ...unsignedTx.toJSON() });

      if (this._core.beforeTxSubmission) {
        const signedTxHex = tx.serialized;
        const proceed = await this._core.beforeTxSubmission({ txType, signedTxHex, txId: tx.hash });
        if (!proceed) {
          return null;
        }
      }

      await this._core.ethers.broadcastTransaction(tx.serialized);
      txId = tx.hash;
    }

    if (this._core.afterTxSubmission) {
      const proceed = await this._core.afterTxSubmission({ txType, txId });
      if (!proceed) {
        return null;
      }
    }

    let receipt: TransactionReceipt | null;
    try {
      receipt = await this._core.ethers.waitForTransaction(txId, null, this._core.const.txConfirmationTimeout);
    } catch (e) {
      if (ethers.isError(e, "TIMEOUT")) {
        receipt = null;
      } else {
        throw e;
      }
    }
    if (receipt) {
      if (submittedByWallet && (receipt.from !== cAddress || (receipt.to ?? null) !== (unsignedTx.to ?? null))) {
        throw new Error(
          `The transaction ${txId} returned by 'signAndSubmitCTransaction' does not match the requested transaction`
        );
      }
      const txStatus = receipt.status === 1;
      if (this._core.afterTxConfirmation) {
        await this._core.afterTxConfirmation({ txType, txId, txStatus });
      }
      if (!txStatus) {
        throw new Error(`Transaction ${txType} with id ${txId} failed`);
      }
    } else {
      throw new Error(`Transaction ${txType} with id ${txId} not confirmed`);
    }
    return receipt;
  }

  private async _signAndSubmitAvaxTx(
    wallet: Wallet,
    account: Account,
    unsignedTx: AvaxTx,
    txType: string
  ): Promise<boolean> {
    const unsignedTxHex = ethers.hexlify(unsignedTx.toBytes());

    if (this._core.beforeTxSignature) {
      const verificationQRCode = await QR.generateCodeForTxVerification(unsignedTxHex);
      const proceed = await this._core.beforeTxSignature({ txType, unsignedTxHex, verificationQRCode });
      if (!proceed) {
        return false;
      }
    }

    const digest = ethers.hexlify(messageHashFromUnsignedTx(unsignedTx));
    const signature = await Signature.signAvaxTx(wallet, unsignedTxHex, digest, account.publicKey);

    const compressedPublicKey = Account.getPublicKey(account.publicKey, true);
    const coordinates = unsignedTx.getSigIndicesForPubKey(ethers.getBytes(compressedPublicKey));
    if (coordinates) {
      const sig = ethers.Signature.from(signature);
      const sigBytes = ethers.getBytes(ethers.concat([sig.r, sig.s, `0x0${sig.yParity}`]));
      coordinates.forEach(([index, subIndex]) => {
        unsignedTx.addSignatureAt(sigBytes, index, subIndex);
      });
    }
    const tx = unsignedTx.getSignedTx().toBytes();

    if (this._core.beforeTxSubmission) {
      const signedTxHex = ethers.hexlify(tx);
      const txHash = ethers.sha256(signedTxHex);
      const txId = futils.base58.encode(futils.addChecksum(ethers.getBytes(txHash)));
      const proceed = await this._core.beforeTxSubmission({ txType, signedTxHex, txId });
      if (!proceed) {
        return false;
      }
    }

    const txIssueResponse = await this._core.flarejs.evmApi.issueTx({ tx: ethers.hexlify(futils.addChecksum(tx)) });
    const txId = txIssueResponse.txID;

    if (this._core.afterTxSubmission) {
      const proceed = await this._core.afterTxSubmission({ txType, txId });
      if (!proceed) {
        return false;
      }
    }

    let status = "Unknown";
    const start = Date.now();
    while (Date.now() - start < this._core.const.txConfirmationTimeout) {
      const statusResponse = await this._core.flarejs.evmApi.getAtomicTxStatus(txId);
      status = statusResponse.status;
      await Utils.sleep(this._core.const.txConfirmationCheckout);
      if (status === "Accepted" || status === "Rejected") {
        if (this._core.afterTxConfirmation) {
          const txStatus = status === "Accepted";
          await this._core.afterTxConfirmation({ txType, txId, txStatus });
        }
        break;
      }
    }
    if (status !== "Accepted") {
      throw new Error(`Transaction ${txType} with id ${txId} not confirmed (status is ${status})`);
    }
    return true;
  }
}
