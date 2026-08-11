import QRCode from 'qrcode'
import { ethers } from 'ethers'

export class QR {

    static async generateCodeForTxVerification(unsignedTxHex: string): Promise<string> {
        let text = await QR._compressGZip(unsignedTxHex)
        return QRCode.toDataURL(text, { errorCorrectionLevel: "L" })
    }

    private static async _compressGZip(hex: string): Promise<string> {
        let compressionStream = new CompressionStream("gzip")
        let compressedStream = new ReadableStream({
            start(controller) {
                controller.enqueue(ethers.getBytes(hex))
                controller.close()
            },
        }).pipeThrough(compressionStream)
        let compressedValue = await new Response(compressedStream).arrayBuffer()
        return ethers.encodeBase64(new Uint8Array(compressedValue))
    }

}