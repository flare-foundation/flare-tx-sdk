import { ethers, SigningKey } from "ethers"
import { bech32 } from "bech32"
import { Utils } from "./utils"

export class Account {

    constructor(publicKey: string, hrp: string) {
        this.publicKey = Account.getPublicKey(publicKey, false)
        this.cAddress = Account.getCAddress(publicKey)
        this.pAddress = Account.getPAddress(publicKey, hrp)
        this.pAddressHex = Account.pAddressToHex(this.pAddress)
    }

    publicKey: string
    cAddress: string
    pAddress: string
    pAddressHex: string
    
    static getPublicKey(publicKey: string, compressed: boolean) : string {
        return SigningKey.computePublicKey(publicKey, compressed)
    }

    static getCAddress(publicKey: string): string {
        return ethers.computeAddress(publicKey)
    }

    static getPAddress(publicKey: string, hrp: string): string {
        let compressed = SigningKey.computePublicKey(publicKey, true)
        let address = ethers.toBeArray(ethers.ripemd160(ethers.sha256(compressed)))
        return bech32.encode(hrp, bech32.toWords(address))
    }

    static pAddressToHex(pAddressBech: string): string {
        return ethers.hexlify(Buffer.from(bech32.fromWords(bech32.decode(pAddressBech).words)))
    }

    static pAddressToBech(pAddressHex: string, hrp: string): string {
        return bech32.encode(hrp, bech32.toWords(Buffer.from(Utils.removeHexPrefix(pAddressHex), "hex")))
    }

    static isCAddress(address: string): boolean {
        return ethers.isAddress(address)
    }
}