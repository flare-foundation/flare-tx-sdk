// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

// Deployless reader used by the SDK via `eth_call` without a `to` address.
// The constructor reads all rNat projects and the claimable reward of `_owner` for each
// project, and returns the ABI-encoded result `(string[] names, bool[] claimingDisabled,
// uint256[] claimableRewards)` instead of runtime code. The contract is never deployed.
//
// The creation bytecode is embedded in src/network/cchain/contract/rnat.ts.
// Compiler settings: solc 0.8.37, optimizer enabled (200 runs), EVM version paris.
interface IRNat {
    function getProjectsBasicInfo() external view returns (string[] memory _names, bool[] memory _claimingDisabled);
    function getClaimableRewards(uint256 _projectId, address _owner) external view returns (uint128);
}

contract RNatProjectsReader {
    constructor(IRNat _rnat, address _owner) {
        (string[] memory names, bool[] memory claimingDisabled) = _rnat.getProjectsBasicInfo();
        uint256[] memory claimableRewards = new uint256[](names.length);
        for (uint256 i = 0; i < names.length; i++) {
            claimableRewards[i] = _rnat.getClaimableRewards(i, _owner);
        }
        bytes memory result = abi.encode(names, claimingDisabled, claimableRewards);
        assembly {
            return(add(result, 32), mload(result))
        }
    }
}
