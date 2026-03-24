import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { tempoModerato } from "viem/chains";
import { withFeePayer } from "viem/tempo";
import { requireHexKey } from "./env";

const DEPLOYER_KEY = requireHexKey("DEPLOYER_KEY");
const RPC = "https://rpc.moderato.tempo.xyz";
const SPONSOR = "https://sponsor.moderato.tempo.xyz";

const deployer = privateKeyToAccount(DEPLOYER_KEY);
const transport = withFeePayer(http(RPC), http(SPONSOR));
const pub = createPublicClient({ chain: tempoModerato, transport });
const wallet = createWalletClient({ account: deployer, chain: tempoModerato, transport });

console.log(`Deployer: ${deployer.address}`);

const __dirname = dirname(fileURLToPath(import.meta.url));
const artifact = JSON.parse(
	readFileSync(resolve(__dirname, "../../../../contracts/out/GuardianFactory.sol/GuardianFactory.json"), "utf-8"),
);

// Skip gas estimation by providing gas directly
const hash = await wallet.deployContract({
	abi: artifact.abi,
	bytecode: artifact.bytecode.object as `0x${string}`,
	gas: 3_000_000n,
});

console.log(`Deploy tx: ${hash}`);
const receipt = await pub.waitForTransactionReceipt({ hash });

if (receipt.status === "reverted") {
	console.log("Deploy REVERTED!");
	process.exit(1);
}

console.log(`\n✅ New GuardianFactory v2 deployed at: ${receipt.contractAddress}`);
console.log(`Block: ${receipt.blockNumber}`);
