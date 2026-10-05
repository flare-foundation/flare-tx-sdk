export type BeforeTxSignature = {
  txType: string;
  unsignedTxHex: string;
  verificationQRCode: string | null; // data URL encoded image of a QR code that can be used for transaction verification (null if the transaction could not be encoded)
};
export type BeforeTxSignatureCallback = ((data: BeforeTxSignature) => Promise<boolean>) | null;

export type BeforeTxSubmission = {
  txType: string;
  signedTxHex: string;
  txId: string;
};
export type BeforeTxSubmissionCallback = ((data: BeforeTxSubmission) => Promise<boolean>) | null;

export type AfterTxSubmission = {
  txType: string;
  txId: string;
};
export type AfterTxSubmissionCallback = ((data: AfterTxSubmission) => Promise<boolean>) | null;

export type AfterTxConfirmation = {
  txType: string;
  txId: string;
  txStatus: boolean;
};
export type AfterTxConfirmationCallback = ((data: AfterTxConfirmation) => Promise<void>) | null;
