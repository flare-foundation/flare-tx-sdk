import type { Wallet } from "../";
import type { TrezorConnector } from "./connector";
import { ethers, Transaction } from "ethers";

/**
 * The class that implements {@link Wallet} and represents a Trezor account.
 */
export class TrezorWallet implements Wallet {
  constructor(connector: TrezorConnector, bip44Path: string) {
    this._connector = connector;
    this._path = bip44Path;
  }

  protected readonly _connector: TrezorConnector;
  protected readonly _path: string;
  protected _address: string;
  protected _publicKey: string;

  /**
   * Returns the public key of the wallet.
   * @returns The public key in the hexadecimal encoding.
   */
  async getPublicKey(): Promise<string> {
    if (!this._publicKey) {
      const response = await this._connector.ethereumGetPublicKey({ path: this._path, showOnTrezor: false });
      const payload = this._readResponse(response, "get public key");
      if (!payload.publicKey) {
        throw new Error("Failed to obtain public key from trezor");
      }
      this._publicKey = this._prefixedHex(payload.publicKey);
    }
    return this._publicKey;
  }

  /**
   * Returns the C-chain address of the wallet.
   * @returns The C-chain address in the hexadecimal encoding.
   */
  async getCAddress(): Promise<string> {
    if (!this._address) {
      const publicKey = await this.getPublicKey();
      this._address = ethers.computeAddress(publicKey);
    }
    return this._address;
  }

  /**
   * Signs a message with ETH prefix.
   * @param message UTF8 encoded message.
   * @returns The signature in hexadecimal encoding.
   */
  async signEthMessage(message: string): Promise<string> {
    const response = await this._connector.ethereumSignMessage({ path: this._path, message: message, hex: false });
    const payload = this._readResponse(response, "sign message");
    if (!payload.signature) {
      throw new Error("Failed to obtain message signature from trezor");
    }
    return this._prefixedHex(payload.signature);
  }

  /**
   * Signs a C-chain (Ethereum Virtual Machine) transaction.
   * @param tx Unsigned C-chain (EVM) transaction in hexadecimal encoding.
   * @returns The signature in hexadecimal encoding.
   */
  async signCTransaction(tx: string): Promise<string> {
    const txObj = Transaction.from(tx);
    const to = txObj.to;
    const value = this._valueToHex(txObj.value);
    const data = txObj.data;
    const nonce = this._valueToHex(txObj.nonce);
    const gasLimit = this._valueToHex(txObj.gasLimit);
    const maxPriorityFeePerGas = this._valueToHex(txObj.maxPriorityFeePerGas);
    const maxFeePerGas = this._valueToHex(txObj.maxFeePerGas);
    const chainId = Number(txObj.chainId);
    const response = await this._connector.ethereumSignTransaction({
      path: this._path,
      transaction: { to, value, data, nonce, gasLimit, maxPriorityFeePerGas, maxFeePerGas, chainId },
    });
    const payload = this._readResponse(response, "sign transaction");
    try {
      const signature = ethers.Signature.from(payload);
      return signature.serialized;
    } catch {
      throw new Error("Failed to obtain transaction signature from trezor");
    }
  }

  protected _readResponse(response: any, method: string): any {
    if (response.success && response.payload) {
      return response.payload;
    }
    let error = `Failed to ${method} on trezor`;
    if (response.payload) {
      const info: string[] = [];
      if (response.payload.error) {
        info.push(`error: ${response.payload.error}`);
      }
      if (response.payload.code) {
        info.push(`code: ${response.payload.code}`);
      }
      if (info.length > 0) {
        error += ` (${info.join(", ")})`;
      }
    }
    throw new Error(error);
  }

  protected _prefixedHex(hex: string): string {
    return hex.startsWith("0x") ? hex : `0x${hex}`;
  }

  protected _valueToHex(value: number | bigint | null): string | null {
    if (value === null) {
      return null;
    } else {
      return `0x${value.toString(16)}`;
    }
  }
}
