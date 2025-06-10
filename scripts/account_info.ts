import { Wallet } from "ethers";
import { existsSync, readFileSync } from "node:fs";
import { Network } from "../src";

async function execute() {
    let privateKeys: Array<string>
    if (process.argv.length > 2) {
        let arg = process.argv[2]
        let text = existsSync(arg) ? readFileSync(arg).toString() : arg
        privateKeys = text.split(",").map(x => x.trim())
    } else {
        console.info("Provide a comma separated list of private keys or a text file containing such list.")
        return
    }

    let networks = {
        FLARE: Network.FLARE,
        SONGBIRD: Network.SONGBIRD,
        COSTON2: Network.COSTON2,
        COSTON: Network.COSTON        
    }

    for (let privateKey of privateKeys) {
        let wallet = new Wallet(privateKey)
        console.log(`Private key: ${wallet.privateKey}`)
        console.log(`Public key: ${wallet.signingKey.compressedPublicKey}`)
        console.log(`C-chain address: ${wallet.address}`)
        for (let network of Object.keys(networks)) {
            let balance = await networks[network].getBalanceOnC(wallet.address)
            let balanceNat = balance / BigInt(1e18)
            console.log(`C-chain balance on ${network}: ${balanceNat.toString()} nats`)
        }
        console.log(`${"=".repeat(100)}`)
    }
}

execute()