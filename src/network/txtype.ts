export class TxType {
    static readonly TRANSFER_NAT = "transfer_nat"
    static readonly TRANSFER_WNAT = "transfer_wnat"
    static readonly TRANSFER_PASSET = "transfer_passet"
    static readonly EXPORT_C = "export_c"
    static readonly IMPORT_C = "import_c"
    static readonly WRAP_NAT = "wrap_nat"
    static readonly UNWRAP_NAT = "unwrap_nat"
    static readonly CLAIM_REWARD_FLAREDROP = "claim_reward_flaredrop"
    static readonly CLAIM_REWARD_STAKING = "claim_reward_staking"
    static readonly CLAIM_REWARD_FTSO = "claim_reward_ftso"
    static readonly DELEGATE_FTSO = "delegate_ftso"
    static readonly UNDELEGATE_FTSO = "undelegate_ftso"
    static readonly CUSTOM_CONTRACT_C = "custom_contract_c"
    static readonly EXPORT_P = "export_p"
    static readonly IMPORT_P = "import_c"
    static readonly ADD_DELEGATOR_P = "add_delegator_p"
    static readonly ADD_VALIDATOR_P = "add_validator_p"

    static getDescription(type: string): string {
        switch (type) {
            case this.TRANSFER_NAT: {
                return "Native coin transfer on the C-chain"
            }
            case this.TRANSFER_WNAT: {
                return "Wrapped coin transfer"
            }
            case this.TRANSFER_PASSET: {
                return "Native coin transfer on the P-chain"
            }
            case this.EXPORT_C: {
                return "Export from the C-chain"
            }
            case this.IMPORT_C: {
                return "Import to the C-chain"
            }
            case this.WRAP_NAT: {
                return "Native coin wrapping"
            }
            case this.UNWRAP_NAT: {
                return "Unwrapping to native coin"
            }
            case this.CLAIM_REWARD_FLAREDROP: {
                return "FlareDrop reward claim"
            }
            case this.CLAIM_REWARD_STAKING: {
                return "Staking reward claim"
            }
            case this.CLAIM_REWARD_FTSO: {
                return "FTSO reward claim"
            }
            case this.DELEGATE_FTSO: {
                return "Delegate to FTSO providers"
            }
            case this.UNDELEGATE_FTSO: {
                return "Undelegate from FTSO providers"
            }
            case this.CUSTOM_CONTRACT_C: {
                return "Custom contract transaction"
            }
            case this.EXPORT_P: {
                return "Export from the P-chain"
            }
            case this.IMPORT_P: {
                return "Import to the P-chain"
            }
            case this.ADD_DELEGATOR_P: {
                return "Stake on the P-chain"
            }
            case this.ADD_VALIDATOR_P: {
                return "Add validator on the P-chain"
            }
            default: {
                return "Unkown transaction type"
            }
        }
    }
}