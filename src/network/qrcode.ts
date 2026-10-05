import QRCode from "qrcode";
import { ethers } from "ethers";

export class QR {
  static async generateCodeForTxVerification(unsignedTxHex: string): Promise<string | null> {
    const text = await QR._compressGZip(unsignedTxHex);
    try {
      return await QRCode.toDataURL(text, { errorCorrectionLevel: "L" });
    } catch {
      // the transaction could not be encoded in a QR code (e.g., it is too large)
      return null;
    }
  }

  private static async _compressGZip(hex: string): Promise<string> {
    const compressionStream = new CompressionStream("gzip");
    const compressedStream = new ReadableStream({
      start(controller) {
        controller.enqueue(ethers.getBytes(hex));
        controller.close();
      },
    }).pipeThrough(compressionStream);
    const compressedValue = await new Response(compressedStream).arrayBuffer();
    return ethers.encodeBase64(new Uint8Array(compressedValue));
  }
}
