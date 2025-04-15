export interface EIP1193Provider {

    request: (request: any) => Promise<unknown>
    on: (event: string, listener: (...args: any[]) => void) => any | void

}