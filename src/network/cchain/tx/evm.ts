import { ethers, Transaction } from "ethers"
import { NetworkBased } from "../../core"
import { SafeProxy } from "../contract/safe_proxy"
import { Utils } from "../../utils"

export type Eip1559TxParams = {
    type: number,
    chainId: number,
    nonce: number,
    maxFeePerGas: bigint,
    maxPriorityFeePerGas: bigint
}

export class Evm extends NetworkBased {

    async getTx(
        sender: string,
        account: string,
        recipient: string,
        data?: string,
        value?: bigint,
        gasLimit?: bigint
    ): Promise<Transaction> {
        data = data ?? "0x"
        value = value ?? BigInt(0)
        let params = await this._getEip1559TxParams(sender)
        let tx: Transaction
        if (!account || account === sender) {
            tx = Transaction.from({ to: recipient, value, data, ...params })
        } else {
            tx = await this._getSafeTx(sender, account, recipient, value, data, params)
        }
        tx.gasLimit = gasLimit ?? await this._computeGasLimit(sender, tx)
        return tx
    }

    protected async _getSafeTx(        
        sender: string,
        account: string,
        recipient: string,
        value: bigint,
        data: string,
        params: Eip1559TxParams
    ): Promise<Transaction> {
        let operation = BigInt(0) // 0: call, 1: delegate call
        let safeTxGas = BigInt(0)
        let baseGas = BigInt(0)
        let gasPrice = BigInt(0)
        let gasToken = ethers.ZeroAddress
        let refundReceiver = ethers.ZeroAddress

        let proxy = new SafeProxy(this._core, account)
        let nonce = await proxy.getNonce()

        let hash = await proxy.getTransactionHash(
            recipient,
            value,
            data,
            operation,
            safeTxGas,
            baseGas,
            gasPrice,
            gasToken,
            refundReceiver,
            nonce
        )

        let owners = await proxy.getOwners()
        let approvals = []
        for (let owner of owners) {
            if (owner === sender) {
                approvals.push(owner)
            } else if (await proxy.isHashApprovedByOwner(owner, hash)) {
                approvals.push(owner)
            }
        }

        let threshold = await proxy.getThreshold()
        if (approvals.length < Number(threshold)) {
            let approveData = proxy.approveHash(hash)
            return Transaction.from({ to: account, value: BigInt(0), data: approveData, ...params })
        } else {
            approvals = approvals.map(a => Utils.removeHexPrefix(a.toLowerCase()))
            approvals.sort((a, b) => parseInt(a, 16) - parseInt(b, 16))
            let signatures = Utils.addHexPrefix(approvals.map(a => `${"0".repeat(24)}${a}${"0".repeat(64)}01`).join(""))
            let executeData = proxy.execTransaction(
                recipient,
                value,
                data,
                operation,
                safeTxGas,
                baseGas,
                gasPrice,
                gasToken,
                refundReceiver,
                signatures
            )
            return Transaction.from({ to: account, value: BigInt(0), data: executeData, ...params })
        }
    }

    protected async _getEip1559TxParams(sender: string): Promise<Eip1559TxParams> {
        let type = 2
        let chainId = await this._core.getCChainId()
        let nonce = await this._core.ethers.getTransactionCount(sender)
        let feeData = await this._core.ethers.getFeeData()
        let maxFeePerGas = this._core.const.evmMaxFeePerGas
        if (feeData.maxFeePerGas) {
            maxFeePerGas = this._roundToGwei(feeData.maxFeePerGas)
        }
        let maxPriorityFeePerGas = this._core.const.evmMaxPriorityFeePerGas
        if (feeData.maxPriorityFeePerGas) {
            maxPriorityFeePerGas = this._roundToGwei(feeData.maxPriorityFeePerGas)
        }
        return { type, chainId, nonce, maxFeePerGas, maxPriorityFeePerGas }
    }

    protected async _computeGasLimit(sender: string, tx: Transaction): Promise<bigint> {
        let estimatedGasLimit: bigint
        try {
            estimatedGasLimit = await this._core.ethers.estimateGas({ from: sender, ...tx.toJSON() })
        } catch (e: any) {
            if (e.reason || e.shortMessage) {
                throw new Error(`The transaction is expected to fail: ${e.reason ?? e.shortMessage}`)
            } else {
                throw e
            }
        }
        let gasLimitExtraRel = Math.ceil(Number(estimatedGasLimit) * this._core.const.evmGasLimitExtraRel)
        let gasLimitExtraAbs = Number(this._core.const.evmGasLimitExtraAbs)
        let gasLimitExtra = Math.max(gasLimitExtraRel, gasLimitExtraAbs)
        let toppedGasLimit = Number(estimatedGasLimit) + gasLimitExtra
        let gasLimitRoundFactor = 1e3
        let gasLimit = BigInt(Math.ceil(toppedGasLimit / gasLimitRoundFactor) * gasLimitRoundFactor)
        return gasLimit
    }

    private _roundToGwei(weiAmount: bigint): bigint {
        let factor = BigInt(1e9)
        return (weiAmount / factor) * factor
    }

}