import { FlareContract } from "../../contract";
import { EvmContract } from "./evm_contract";
import { PChainStakeMirrorVerifier } from "./stake_verifier";
import { WNat } from "./wnat";
import { Utils } from "../../utils";
import { DistributionToDelegators } from "./flaredrop";
import { GenericRewardManager } from "./generic_reward_manager";
import { RewardManager } from "./reward_manager";

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

    async getFlareDropDistribution(): Promise<DistributionToDelegators> {
        let address = await this.getAddress("DistributionToDelegators")
        return new DistributionToDelegators(this._core, address)
    }

    async getValidatorRewardManager(): Promise<GenericRewardManager> {
        let address = await this.getAddress("ValidatorRewardManager")
        return new GenericRewardManager(this._core, address)
    }

    async getRewardManager(): Promise<RewardManager> {
        let address = await this.getAddress("RewardManager")
        return new RewardManager(this._core, address)
    }

    async getStakeVerifier(): Promise<PChainStakeMirrorVerifier> {
        let address = await this.getAddress("PChainStakeMirrorVerifier")
        return new PChainStakeMirrorVerifier(this._core, address)
    }

}