import { ethers } from "ethers";

export enum AttestationType {
    EVM_TRANSACTION = "EVMTransaction",
    PAYMENT = "Payment",
    ADDRESS_VALIDITY = "AddressValidity"
}

export class AttestationTypes {

    static getCode(type: AttestationType): string {
        return ethers.zeroPadBytes(ethers.toUtf8Bytes(type), 32)
    }

    static getType(code: string): AttestationType {
        if (code == this.getCode(AttestationType.EVM_TRANSACTION)) {
            return AttestationType.EVM_TRANSACTION
        } else if (code == this.getCode(AttestationType.PAYMENT)) {
            return AttestationType.PAYMENT
        } else if (code == this.getCode(AttestationType.ADDRESS_VALIDITY)) {
            return AttestationType.ADDRESS_VALIDITY
        }
    }

}