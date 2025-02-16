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