export interface Wallet {

    /**
     * Returns the public key of the wallet.
     * @returns The public key in hexadecimal encoding.
     */
    getPublicKey?(): Promise<string>

    /**
     * Returns the C-chain address of the wallet.
     * @returns The C-chain address in hexadecimal encoding.
     */
    getCAddress?(): Promise<string>
    
    /**
     * Signs a digest of the message.
     * @param digest Digest in hexadecimal encoding.
     * @returns The signature in hexadecimal encoding.
     */
    signDigest?(digest: string): Promise<string>

    /**
     * Signs a message with ETH prefix.
     * @param message UTF8 encoded message.
     * @returns The signature in hexadecimal encoding.
     */
    signEthMessage?(message: string): Promise<string>

    /**
     * Signs a C-chain (Ethereum Virtual Machine) transaction.
     * @param tx Unsigned C-chain (EVM) transaction in hexadecimal encoding.
     * @returns The signature in hexadecimal encoding.
     */
    signCTransaction?(tx: string): Promise<string>

    /**
     * Signs and submits a C-chain (Ethereum Virtual Machine) transaction.
     * @param tx Unsigned C-chain (EVM) transaction in hexadecimal encoding.
     * @returns The transaction id in hexadecimal encoding.
     */
    signAndSubmitCTransaction?(tx: string): Promise<string>

    /**
     * Signs a P-chain transaction.
     * @param tx Unsigned P-chain transaction in hexadecimal encoding.
     * @returns The signature in hexadecimal encoding.
     */
    signPTransaction?(tx: string): Promise<string>
}