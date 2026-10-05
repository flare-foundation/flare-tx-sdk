import { AbiCoder } from "ethers";
import type { RNatAccountBalance, RNatProject, RNatProjectAndClaimableReward, RNatProjectInfo } from "../../iotype";
import { EvmContract } from "./evm_contract";

// Creation bytecode of misc/contracts/RNatProjectsReader.sol (solc 0.8.37, optimizer 200 runs, EVM version paris).
const RNAT_PROJECTS_READER_BYTECODE =
  "0x608060405234801561001057600080fd5b506040516105b23803806105b283398101604081905261002f916101d7565b600080836001600160a01b031663d7dd16ff6040518163ffffffff1660e01b8152600401600060405180830381865afa158015610070573d6000803e3d6000fd5b505050506040513d6000823e601f3d908101601f191682016040526100989190810190610319565b91509150600082516001600160401b038111156100b7576100b7610211565b6040519080825280602002602001820160405280156100e0578160200160208202803683370190505b50905060005b835181101561018e57604051630ab60df960e41b8152600481018290526001600160a01b03868116602483015287169063ab60df9090604401602060405180830381865afa15801561013c573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906101609190610453565b6001600160801b031682828151811061017b5761017b610483565b60209081029190910101526001016100e6565b5060008383836040516020016101a693929190610509565b6040516020818303038152906040529050805160208201f35b6001600160a01b03811681146101d457600080fd5b50565b600080604083850312156101ea57600080fd5b82516101f5816101bf565b6020840151909250610206816101bf565b809150509250929050565b634e487b7160e01b600052604160045260246000fd5b604051601f8201601f191681016001600160401b038111828210171561024f5761024f610211565b604052919050565b60006001600160401b0382111561027057610270610211565b5060051b60200190565b60005b8381101561029557818101518382015260200161027d565b50506000910152565b600082601f8301126102af57600080fd5b81516102c26102bd82610257565b610227565b8082825260208201915060208360051b8601019250858311156102e457600080fd5b602085015b8381101561030f578051801515811461030157600080fd5b8352602092830192016102e9565b5095945050505050565b6000806040838503121561032c57600080fd5b82516001600160401b0381111561034257600080fd5b8301601f8101851361035357600080fd5b80516103616102bd82610257565b8082825260208201915060208360051b85010192508783111561038357600080fd5b602084015b8381101561041c5780516001600160401b038111156103a657600080fd5b8501603f81018a136103b757600080fd5b60208101516001600160401b038111156103d3576103d3610211565b6103e6601f8201601f1916602001610227565b8181526040838301018c10156103fb57600080fd5b61040c82602083016040860161027a565b8552505060209283019201610388565b506020870151909550925050506001600160401b0381111561043d57600080fd5b6104498582860161029e565b9150509250929050565b60006020828403121561046557600080fd5b81516001600160801b038116811461047c57600080fd5b9392505050565b634e487b7160e01b600052603260045260246000fd5b600081518084526020840193506020830160005b828110156104cd57815115158652602095860195909101906001016104ad565b5093949350505050565b600081518084526020840193506020830160005b828110156104cd5781518652602095860195909101906001016104eb565b6000606082016060835280865180835260808501915060808160051b86010192506020880160005b8281101561057d57607f198786030184528151805180875261055a81602089016020850161027a565b601f01601f19169590950160209081019550938401939190910190600101610531565b5050505082810360208401526105938186610499565b905082810360408401526105a781856104d7565b969550505050505056fe";

export class RNat extends EvmContract {
  async getProjectsBasicInfo(): Promise<Array<RNatProject>> {
    const rnat = this._getContract([
      "function getProjectsBasicInfo() external view returns (string[] memory _names, bool[] memory _claimingDisabled)",
    ]);
    const result = (await rnat.getProjectsBasicInfo()) as Array<any>;
    return result[0].map(
      (_: any, i: number) => <RNatProject>{ id: i, name: result[0][i], claimingDisabled: result[1][i] }
    );
  }

  async getProjectsBasicInfoAndClaimableRewards(owner: string): Promise<Array<RNatProjectAndClaimableReward>> {
    const coder = AbiCoder.defaultAbiCoder();
    const args = coder.encode(["address", "address"], [this.address, owner]);
    const data = RNAT_PROJECTS_READER_BYTECODE + args.slice(2);
    const result = coder.decode(["string[]", "bool[]", "uint256[]"], await this._core.ethers.call({ data }));
    return result[0].map(
      (_: any, i: number) =>
        <RNatProjectAndClaimableReward>{
          id: i,
          name: result[0][i],
          claimingDisabled: result[1][i],
          claimableReward: result[2][i],
        }
    );
  }

  async getProjectInfo(projectId: number): Promise<RNatProjectInfo> {
    const rnat = this._getContract([
      "function getProjectInfo(uint256 _projectId) external view returns (string memory _name, address _distributor, bool _currentMonthDistributionEnabled, bool _distributionDisabled, bool _claimingDisabled, uint128 _totalAssignedRewards, uint128 _totalDistributedRewards, uint128 _totalClaimedRewards, uint128 _totalUnassignedUnclaimedRewards, uint256[] memory _monthsWithRewards)",
    ]);
    const result = await rnat.getProjectInfo(projectId);
    return {
      name: result[0],
      distributor: result[1],
      currentMonthDistributionEnabled: result[2],
      distributionDisabled: result[3],
      claimingDisabled: result[4],
      totalAssignedRewards: result[5],
      totalDistributedRewards: result[6],
      totalClaimedRewards: result[7],
      totalUnassignedUnclaimedRewards: result[8],
      monthsWithRewards: result[9].map((m: bigint) => m),
    };
  }

  async getClaimableRewards(projectId: number, owner: string): Promise<bigint> {
    const rnat = this._getContract([
      "function getClaimableRewards(uint256 _projectId, address _owner) external view returns (uint128)",
    ]);
    return rnat.getClaimableRewards(projectId, owner);
  }

  async getBalancesOf(owner: string): Promise<RNatAccountBalance> {
    const rnat = this._getContract([
      "function getBalancesOf(address _owner) external view returns (uint256 _wNatBalance, uint256 _rNatBalance, uint256 _lockedBalance)",
    ]);
    const result = await rnat.getBalancesOf(owner);
    return {
      wNatBalance: result[0],
      rNatBalance: result[1],
      lockedBalance: result[2],
    };
  }

  async getRNatAccount(owner: string): Promise<string> {
    const rnat = this._getContract(["function getRNatAccount(address _owner) external view returns (address)"]);
    return rnat.getRNatAccount(owner);
  }

  async getCurrentMonth(): Promise<bigint> {
    const rnat = this._getContract(["function getCurrentMonth() external view returns (uint256)"]);
    return rnat.getCurrentMonth();
  }

  claimRewards(projectIds: Array<number>, month: bigint): string {
    const rnat = this._getContract([
      "function claimRewards(uint256[] calldata _projectIds, uint256 _month) external returns (uint128 _claimedRewardsWei)",
    ]);
    return this._getData(rnat, rnat.claimRewards, projectIds, month);
  }

  withdraw(amount: bigint, wrap: boolean): string {
    const rnat = this._getContract(["function withdraw(uint128 _amount, bool _wrap) external"]);
    return this._getData(rnat, rnat.withdraw, amount, wrap);
  }

  withdrawAll(wrap: boolean): string {
    const rnat = this._getContract(["function withdrawAll(bool _wrap) external"]);
    return this._getData(rnat, rnat.withdrawAll, wrap);
  }
}
