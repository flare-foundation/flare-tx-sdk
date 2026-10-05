import { ethers, SigningKey } from "ethers";
import { utils as futils } from "@flarenetwork/flarejs";

export class Account {
  constructor(publicKey: string, hrp: string) {
    this.publicKey = Account.getPublicKey(publicKey, false);
    this.cAddress = Account.getCAddress(publicKey);
    this.pAddress = Account.getPAddress(publicKey, hrp);
    this.pAddressHex = Account.pAddressToHex(this.pAddress);
  }

  publicKey: string;
  cAddress: string;
  pAddress: string;
  pAddressHex: string;

  static getPublicKey(publicKey: string, compressed: boolean): string {
    return SigningKey.computePublicKey(publicKey, compressed);
  }

  static getCAddress(publicKey: string): string {
    return ethers.computeAddress(publicKey);
  }

  static normalizedCAddress(cAddress: string): string {
    return ethers.getAddress(cAddress);
  }

  static getPAddress(publicKey: string, hrp: string): string {
    const compressed = SigningKey.computePublicKey(publicKey, true);
    const address = ethers.getBytes(ethers.ripemd160(ethers.sha256(compressed)));
    return futils.formatBech32(hrp, address);
  }

  static pAddressToHex(pAddressBech: string): string {
    return ethers.hexlify(futils.parseBech32(pAddressBech)[1]);
  }

  static pAddressToBech(pAddressHex: string, hrp: string): string {
    return futils.formatBech32(hrp, ethers.getBytes(pAddressHex));
  }

  static isCAddress(address: string): boolean {
    return typeof address === "string" && /^0x[0-9a-fA-F]{40}$/.test(address) && ethers.isAddress(address);
  }

  static isPAddress(address: string, hrp: string): boolean {
    if (typeof address !== "string") {
      return false;
    }
    const bech = address.startsWith("P-") ? address.slice(2) : address;
    try {
      const [prefix, bytes] = futils.parseBech32(bech);
      return prefix === hrp && bytes.length === 20;
    } catch {
      return false;
    }
  }

  static normalizePAddress(address: string, hrp: string): string {
    const bech = address.startsWith("P-") ? address.slice(2) : address;
    return futils.formatBech32(hrp, futils.parseBech32(bech)[1]);
  }
}
