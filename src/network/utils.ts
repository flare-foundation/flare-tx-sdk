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

    static min(...values: bigint[]): bigint {
        let m = undefined
        for (let value of values) {
            if (!m) {
                m = value
            } else if (value && value < m) {
                m = value
            }
        }
        return m
    }

    static max(...values: bigint[]): bigint {
        let m = undefined
        for (let value of values) {
            if (!m) {
                m = value
            } else if (value && value > m) {
                m = value
            }
        }
        return m
    }

    static async sleep(ms: number): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, ms));
    }

}