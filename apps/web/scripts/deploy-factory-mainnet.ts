import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { tempo } from "viem/chains";
import { requireHexKey } from "./demo/env";

const DEPLOYER_KEY = requireHexKey("DEPLOYER_KEY");
const RPC = "https://rpc.tempo.xyz";
const USDC_E = "0x20c000000000000000000000b9537d11c60e8b50" as `0x${string}`;

// Set feeToken on chain so all transactions pay gas in USDC.e
const chain = { ...tempo, feeToken: USDC_E };

const deployer = privateKeyToAccount(DEPLOYER_KEY);
const pub = createPublicClient({ chain, transport: http(RPC) });
const wallet = createWalletClient({ account: deployer, chain, transport: http(RPC) });

console.log(`Deployer: ${deployer.address}`);
console.log(`Chain: Tempo mainnet (4217)`);
console.log(`Fee token: USDC.e (${USDC_E})`);

// Check USDC.e balance
const balance = await pub.readContract({
	address: USDC_E,
	abi: parseAbi(["function balanceOf(address) view returns (uint256)"]),
	functionName: "balanceOf",
	args: [deployer.address],
});
console.log(`USDC.e balance: ${Number(balance) / 1e6}`);

if (balance === 0n) {
	console.log("No USDC.e. Fund the deployer first.");
	process.exit(1);
}

// Deploy GuardianFactory
console.log("\nDeploying GuardianFactory...");
const __dirname = dirname(fileURLToPath(import.meta.url));
const artifact = JSON.parse(
	readFileSync(
		resolve(__dirname, "../../contracts/out/GuardianFactory.sol/GuardianFactory.json"),
		"utf-8",
	),
);

const hash = await wallet.deployContract({
	abi: artifact.abi,
	bytecode: artifact.bytecode.object as `0x${string}`,
	gas: 10_000_000n,
});

console.log(`Deploy tx: ${hash}`);
console.log(`Explorer: https://explorer.tempo.xyz/tx/${hash}`);

const receipt = await pub.waitForTransactionReceipt({ hash });

if (receipt.status === "reverted") {
	console.log("Deploy REVERTED!");
	process.exit(1);
}

console.log(`\n✅ GuardianFactory deployed at: ${receipt.contractAddress}`);
console.log(`Block: ${receipt.blockNumber}`);
