import { Wallet } from "ethers"

let wallet = Wallet.createRandom()
console.log(`Private key: ${wallet.privateKey}`)
console.log(`Public key: ${wallet.publicKey}`)
console.log(`C-chain address: ${wallet.address}`)