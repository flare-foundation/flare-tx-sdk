/**
 * The type used for returning account balance information.
 * @remark All provided amounts are in weis.
 */
export type Balance = {
    availableOnC: bigint,
    availableOnP: bigint,
    wrappedOnC: bigint,
    stakedOnP: bigint,
    notImportedToC: bigint,
    notImportedToP: bigint
}

/**
 * The type used for returning basic RNat project information
 */
export type RNatProject = {
    id: number,
    name: string,
    claimingDisabled: boolean
}

/**
 * The type used for returning detailed RNat project information
 */
export type RNatProjectInfo = {
    name: string, // project name
    distributor: string, // address of the distributor of the rewards for the project
    currentMonthDistributionEnabled: boolean, // if reward distribution is possible for the current month
    distributionDisabled: boolean,  // if distribution of the rewards is disabled
    claimingDisabled: boolean, // if claiming of rewards is disabled
    totalAssignedRewards: bigint, // total rewards awarded by Flare for this project
    totalDistributedRewards: bigint, // total distributed amount of assigned rewards by the distributor
    totalClaimedRewards: bigint, // total claimed amount of the distributed rewards by the users
    totalUnassignedUnclaimedRewards: bigint, // total rewards that are claimed back by Flare if distribution and claiming is permanently disabled for the project
    monthsWithRewards: Array<bigint> // list of months with claimable rewards
}

/**
 * The type used for returning RNat account balance
 */
export type RNatAccountBalance = {
    wNatBalance: bigint,
    rNatBalance: bigint,
    lockedBalance: bigint
}

/**
 * FTSO reward claim types
 */
export enum ClaimType { DIRECT, FEE, WNAT, MIRROR, CCHAIN }

/**
 * The type used for returning FTSO reward state information
 */
export type FtsoRewardState = {
    rewardEpochId: bigint
    beneficiary: string // C-chain address or node id (if claimType is MIRROR)
    amount: bigint // in weis
    claimType: ClaimType
    initialised: boolean
}

/**
 * The type used for specifying FTSO reward claims
 */
export type FtsoRewardClaim = {
    rewardEpochId: bigint
    beneficiary: string // C-chain address or node id (if claimType is MIRROR)
    amount: bigint // in weis
    claimType: ClaimType
}

/**
 * The type used for specifying FTSO reward claims with Merkle proofs
 */
export type FtsoRewardClaimWithProof = {
    merkleProof: string[]
    body: FtsoRewardClaim
}

/**
 * The type used for returning FTSO delegate information
 */
export type FtsoDelegate = {
    address: string,
    shareBP: bigint
}

/**
 * The type used for returning information on stakes on the P-chain
 */
export type Stake = {
    txId: string,
    type: string, // `delegator` or `validator`
    pAddress: string,
    nodeId: string,
    startTime: bigint, // in seconds from unix
    endTime: bigint, // in seconds from unix
    amount: bigint,
    feePercentage?: number // provided if type == `validator`
}

/**
 * The type used for returning information on stake limits
 */
export type StakeLimits = {
    minStakeDuration: bigint, // in seconds
    maxStakeDuration: bigint, // in seconds
    minStakeAmountDelegator: bigint, // in weis
    minStakeAmountValidator: bigint, // in weis
    maxStakeAmount: bigint // in weis
}

/**
 * The type used for representing a Safe smart account
 */
export type SafeSmartAccount = {
    address: string,
    owners: Array<string>,
    threshold: bigint
}