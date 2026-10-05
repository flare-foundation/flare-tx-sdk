import { ethers, JsonRpcProvider, Transaction, Wallet } from "ethers";
import type { ChainData } from "../../../src/wallet/eip1193/chain";
import type { EIP1193Provider } from "../../../src/wallet/eip1193/provider";

export class TestProvider implements EIP1193Provider {
  constructor(privateKeys: Array<string>) {
    this.wallets = privateKeys.map((pk) => new Wallet(pk));
  }

  private chainId: string;
  private chains: { [id: string]: ChainData } = {};
  private wallets: Array<Wallet>;
  private accountsChangedListeners: Array<(...args: any[]) => void> = [];

  changeAccount(index: number): void {
    if (index > this.wallets.length - 1) {
      throw new Error("Invalid account index");
    }
    if (index > 0) {
      const wallet = this.wallets[index];
      this.wallets.splice(index, 1);
      this.wallets.unshift(wallet);
      const accounts = this.wallets.map((w) => w.address);
      this.accountsChangedListeners.forEach((listener) => {
        listener(accounts);
      });
    }
  }

  async request(request: any): Promise<unknown> {
    if (request.method === "eth_requestAccounts") {
      return this.wallets.map((w) => w.address);
    } else if (request.method === "eth_chainId") {
      return this.chainId;
    } else if (request.method === "wallet_addEthereumChain") {
      const chainId = request.params[0].chainId;
      this.chains[chainId] = request.params[0];
      return null;
    } else if (request.method === "wallet_switchEthereumChain") {
      this.chainId = request.params[0].chainId;
      return null;
    } else if (request.method === "personal_sign") {
      if (this.wallets.length === 0) {
        throw new Error("No accounts to handle `personal_sign` request");
      }
      return this.wallets[0].signMessage(ethers.toUtf8String(request.params[0]));
    } else if (request.method === "eth_sendTransaction") {
      if (this.wallets.length === 0) {
        throw new Error("No accounts to handle `eth_sendTransaction` request");
      }
      const provider = new JsonRpcProvider(this.chains[this.chainId].rpcUrls[0]);
      const tx = request.params[0];
      const txJson = {
        to: tx.to,
        type: 2,
        chainId: BigInt(this.chainId),
        nonce: await provider.getTransactionCount(this.wallets[0].address),
        value: BigInt(tx.value),
        data: tx.data,
        gasLimit: BigInt(tx.gas),
        maxFeePerGas: BigInt(tx.maxFeePerGas),
        maxPriorityFeePerGas: BigInt(tx.maxPriorityFeePerGas),
      };
      const txObj = Transaction.from(txJson);
      const digest = txObj.unsignedHash;
      const signature = this.wallets[0].signingKey.sign(digest).serialized;
      const signedTxObj = Transaction.from({ signature, ...txObj.toJSON() });
      const txResponse = await provider.broadcastTransaction(signedTxObj.serialized);
      return txResponse.hash;
    }
    throw new Error(`Unimplemented request method ${request.method}`);
  }

  on(event: string, listener: (...args: any[]) => void): any | undefined {
    if (event === "accountsChanged") {
      this.accountsChangedListeners.push(listener);
      return;
    }
    throw new Error(`Unimplemented event ${event}`);
  }
}
