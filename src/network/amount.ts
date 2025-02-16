import { ethers } from "ethers"

/**
 * Utility class for converting amount units.
 */
export class Amount {

    /**
     * Converts the given value of native coin to the amount in weis.
     * @param value A value in flrs.
     * @returns The amount in weis.
     */
    static nats(value: number | bigint | string): bigint {
        return ethers.parseEther(value.toString())
    }

    /**
     * Converts the given value of wrapped native coin to the amount in weis.
     * @param value A value in wnats.
     * @returns The amount in weis.
     */
    static wnats(value: number | bigint | string): bigint {
        return this.nats(value)
    }

    /**
     * Converts the given gwei value to the amount in weis.
     * @param value A value in gweis.
     * @returns The amount in weis.
     */
    static gweis(value: number | bigint | string): bigint {
        return ethers.parseUnits(value.toString(), "gwei")
    }

    /**
     * Converts the given percentage to the amount in base points.
     * @param value A percentage value.
     * @returns The amount in base points.
     */
    static percentages(value: number | bigint | string): bigint {
        return ethers.parseUnits(value.toString(), 2)
    }

}