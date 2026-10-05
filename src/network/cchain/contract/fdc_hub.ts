import { EvmContract } from "./evm_contract";

export class FdcHub extends EvmContract {
  requestAttestation(data: string): string {
    const hub = this._getContract(["function requestAttestation(bytes calldata data) external payable"]);
    return this._getData(hub, hub.requestAttestation, data);
  }
}
