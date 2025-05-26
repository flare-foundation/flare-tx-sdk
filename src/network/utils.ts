export class Utils {

    static addHexPrefix(hex: string): string {
        return hex.startsWith('0x') ? hex : `0x${hex}`
    }

    static removeHexPrefix(hex: string): string {
        return hex.startsWith('0x') ? hex.slice(2) : hex
    }
    
    static isZeroHex(value: string): boolean {
        return /^(0x)?(0+)?$/.test(value)
    }

    /*
    static toBigint(value: BN | number): bigint {
        return BigInt(value.toString(10))
    }

    static toBn(value: bigint): BN {
        return new BN(value.toString(10), 10)
    }
    */

    static async sleep(ms: number): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, ms));
    }

}