import QRCode from 'qrcode'

export class QR {

    static async generateCodeForTxVerification(unsignedTxHex: string): Promise<string> {
        let text = await QR._compressGZip(unsignedTxHex)
        return QRCode.toDataURL(text, { errorCorrectionLevel: "L" })
    }

    private static async _compressGZip(hex: string): Promise<string> {
        let compressionStream = new CompressionStream("gzip")
        let compressedStream = new ReadableStream({
            start(controller) {
                controller.enqueue(Buffer.from(hex.slice(2), "hex"))
                controller.close()
            },
        }).pipeThrough(compressionStream)
        let decompressedValue = await new Response(compressedStream).arrayBuffer()
        return Buffer.from(decompressedValue).toString("base64")
    }

}