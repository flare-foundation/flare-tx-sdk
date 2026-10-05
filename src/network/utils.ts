export class Utils {
  static addHexPrefix(hex: string): string {
    return hex.startsWith("0x") ? hex : `0x${hex}`;
  }

  static removeHexPrefix(hex: string): string {
    return hex.startsWith("0x") ? hex.slice(2) : hex;
  }

  static isZeroHex(value: string): boolean {
    return /^(0x)?(0+)?$/.test(value);
  }

  static min(...values: bigint[]): bigint {
    let m: bigint | undefined;
    for (const value of values) {
      if (value === undefined || value === null) {
        continue;
      }
      if (m === undefined || value < m) {
        m = value;
      }
    }
    return m;
  }

  static max(...values: bigint[]): bigint {
    let m: bigint | undefined;
    for (const value of values) {
      if (value === undefined || value === null) {
        continue;
      }
      if (m === undefined || value > m) {
        m = value;
      }
    }
    return m;
  }

  /**
   * Parses JSON text such that integers outside the safe number range are returned as bigint
   * values instead of being rounded.
   */
  static parseJsonWithBigInts(text: string): any {
    const marker = "\u0000bigint:";
    const numberRegex = /-?\d+(\.\d+)?([eE][+-]?\d+)?/y;
    let result = "";
    let inString = false;
    let i = 0;
    while (i < text.length) {
      const c = text[i];
      if (inString) {
        if (c === "\\") {
          result += c + text[i + 1];
          i += 2;
          continue;
        }
        if (c === '"') {
          inString = false;
        }
        result += c;
        i++;
      } else if (c === '"') {
        inString = true;
        result += c;
        i++;
      } else if (c === "-" || (c >= "0" && c <= "9")) {
        numberRegex.lastIndex = i;
        const token = numberRegex.exec(text)?.[0] ?? c;
        const isInteger = /^-?\d+$/.test(token);
        result += isInteger && !Number.isSafeInteger(Number(token)) ? `"\\u0000bigint:${token}"` : token;
        i += token.length;
      } else {
        result += c;
        i++;
      }
    }
    return JSON.parse(result, (_, value) =>
      typeof value === "string" && value.startsWith(marker) && /^-?\d+$/.test(value.slice(marker.length))
        ? BigInt(value.slice(marker.length))
        : value
    );
  }

  static async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
