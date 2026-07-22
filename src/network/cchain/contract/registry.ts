import { FlareContract } from "../../contract";
import { EvmContract } from "./evm_contract";
import { PChainStakeMirrorVerifier } from "./stake_verifier";
import { WNat } from "./wnat";
import { Utils } from "../../utils";
import { GenericRewardManager } from "./generic_reward_manager";
import { RewardManager } from "./reward_manager";
import { RNat } from "./rnat";
import { PollingFoundation } from "./polling";
import { GovernanceVotePower } from "./vote_power";
import { FdcHub } from "./fdc_hub";
import { FdcRequestFeeConfigurations } from "./fdc_request_fee_configurations";
import { FlareSystemsManager } from "./flare_systems_manager";
import { Relay } from "./relay";
import { FdcVerification } from "./fdc_verification";

export class ContractRegistry extends EvmContract {

    async getAddress(contractName: string): Promise<string> {
        let registry = this._getContract(["function getContractAddressByName(string calldata _name) external view override returns(address)"])
        let address = await registry.getContractAddressByName(contractName)
        if (Utils.isZeroHex(address)) {
            let contracts = await this.getAllContracts()
            let contract = contracts.find(c => c.name.toLowerCase() === contractName.toLowerCase())
            if (contract) {
                address = contract.address
            }
        }
        return address
    }

    async getAllContracts(): Promise<Array<FlareContract>> {
        let registry = this._getContract(["function getAllContracts() external view override returns(string[] memory, address[] memory)"])
        let result = await registry.getAllContracts() as Array<any[]>
        return result[0].map((_, i) => <FlareContract>{ name: result[0][i], address: result[1][i] })
    }

    async getWNat(): Promise<WNat> {
        let address = await this.getAddress("WNat")
        return new WNat(this._core, address)
    }

    async getRNat(): Promise<RNat> {
        let address = await this.getAddress("RNat")
        return new RNat(this._core, address)
    }

    async getValidatorRewardManager(): Promise<GenericRewardManager> {
        let address = await this.getAddress("ValidatorRewardManager")
        return new GenericRewardManager(this._core, address)
    }

    async getRewardManager(): Promise<RewardManager> {
        let address = await this.getAddress("RewardManager")
        return new RewardManager(this._core, address)
    }

    async getPollingFoundation(): Promise<PollingFoundation> {
        let address = await this.getAddress("PollingFoundation")
        return new PollingFoundation(this._core, address)
    }

    async getGovernanceVotePower(): Promise<GovernanceVotePower> {
        let address = await this.getAddress("GovernanceVotePower")
        return new GovernanceVotePower(this._core, address)
    }

    async getStakeVerifier(): Promise<PChainStakeMirrorVerifier> {
        let address = await this.getAddress("PChainStakeMirrorVerifier")
        return new PChainStakeMirrorVerifier(this._core, address)
    }

    async getFdcHub(): Promise<FdcHub> {
        let address = await this.getAddress("FdcHub")
        return new FdcHub(this._core, address)
    }

    async getFdcRequestFeeConfigurations(): Promise<FdcRequestFeeConfigurations> {
        let address = await this.getAddress("FdcRequestFeeConfigurations")
        return new FdcRequestFeeConfigurations(this._core, address)
    }

    async getFdcVerification(): Promise<FdcVerification> {
        let address = await this.getAddress("FdcVerification")
        return new FdcVerification(this._core, address)
    }

    async getFlareSystemManager(): Promise<FlareSystemsManager> {
        let address = await this.getAddress("FlareSystemsManager")
        return new FlareSystemsManager(this._core, address)
    }

    async getRelay(): Promise<Relay> {
        let address = await this.getAddress("Relay")
        return new Relay(this._core, address)
    }

}