import { FdcAttestation } from "src/network/iotype";
import { EvmContract } from "./evm_contract";

export class FdcVerification extends EvmContract {

    async verifyEVMTransaction(attestation: FdcAttestation): Promise<boolean> {
        let verification = this._getContract(["function verifyEVMTransaction(tuple(bytes32[] proof, tuple(bytes32 attestationType, bytes32 sourceId, uint64 votingRound, uint64 lowestUsedTimestamp, tuple(bytes32 transactionHash, uint16 requiredConfirmations, bool provideInput, bool listEvents, uint32[] logIndices) requestBody, tuple(uint64 blockNumber, uint64 timestamp, address sourceAddress, bool isDeployment, address receivingAddress, uint256 value, bytes input, uint8 status, tuple(uint32 logIndex, address emitterAddress, bytes32[] topics, bytes data, bool removed)[] events) responseBody) response) calldata attestation) external view returns (bool _proved)"])
        return verification.verifyEVMTransaction(attestation)
    }

    async verifyPayment(attestation: FdcAttestation): Promise<boolean> {
        let verification = this._getContract(["function verifyPayment(tuple(bytes32[] proof, tuple(bytes32 attestationType, bytes32 sourceId, uint64 votingRound, uint64 lowestUsedTimestamp, tuple(bytes32 transactionId, uint256 inUtxo, uint256 utxo) requestBody, tuple(uint64 blockNumber, uint64 blockTimestamp, bytes32 sourceAddressHash, bytes32 sourceAddressesRoot, bytes32 receivingAddressHash, bytes32 intendedReceivingAddressHash, int256 spentAmount, int256 intendedSpentAmount, int256 receivedAmount, int256 intendedReceivedAmount, bytes32 standardPaymentReference, bool oneToOne, uint8 status) responseBody) response) calldata attestation) external view returns (bool _proved)"])
        return verification.verifyPayment(attestation)
    }

    async verifyAddressValidity(attestation: FdcAttestation): Promise<boolean> {
        let verification = this._getContract(["function verifyAddressValidity(tuple(bytes32[] proof, tuple(bytes32 attestationType, bytes32 sourceId, uint64 votingRound, uint64 lowestUsedTimestamp, tuple(string addressStr) requestBody, tuple(bool isValid, string standardAddress, bytes32 standardAddressHash) responseBody) response) calldata attestation) external view returns (bool _proved)"])
        return verification.verifyAddressValidity(attestation)
    }

    async verifyWeb2Json(attestation: FdcAttestation): Promise<boolean> {
        let verification = this._getContract(["function verifyWeb2Json(tuple(bytes32[] proof, tuple(bytes32 attestationType, bytes32 sourceId, uint64 votingRound, uint64 lowestUsedTimestamp, tuple(string url, string httpMethod, string headers, string queryParams, string body, string postProcessJq, string abiSignature) requestBody, tuple(bytes abiEncodedData) responseBody) response) calldata attestation) external view returns (bool _proved)"])
        return verification.verifyWeb2Json(attestation)
    }

}