import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { tempo } from "viem/chains";
import { withFeePayer } from "viem/tempo";

const DEPLOYER_KEY = "0x35fd9abab43a71403557b4078265c0b7be019b52766d74060d8738a05576c635";
const RPC = "https://rpc.tempo.xyz";
const SPONSOR = "https://sponsor.tempo.xyz";

const DEX = "0xDEc0000000000000000000000000000000000000";
const USDC_E = "0x20c000000000000000000000b9537d11c60e8b50"; // USDC.e on mainnet
const PATH_USD = "0x20c0000000000000000000000000000000000000"; // pathUSD (fee token)

const deployer = privateKeyToAccount(DEPLOYER_KEY);
const transport = withFeePayer(http(RPC), http(SPONSOR));
const pub = createPublicClient({ chain: tempo, transport });
const wallet = createWalletClient({ account: deployer, chain: tempo, transport });

const tip20Abi = parseAbi([
	"function balanceOf(address) view returns (uint256)",
	"function approve(address spender, uint256 amount) returns (bool)",
]);

const dexAbi = parseAbi([
	"function swapExactAmountIn(address tokenIn, address tokenOut, uint128 amountIn, uint128 minAmountOut) external returns (uint128 amountOut)",
	"function quoteSwapExactAmountIn(address tokenIn, address tokenOut, uint128 amountIn) external view returns (uint128 amountOut)",
]);

console.log(`Deployer: ${deployer.address}`);

// Step 1: Check USDC.e balance
const usdcBalance = await pub.readContract({
	address: USDC_E as `0x${string}`,
	abi: tip20Abi,
	functionName: "balanceOf",
	args: [deployer.address],
});
console.log(`USDC.e balance: ${Number(usdcBalance) / 1e6}`);

const pathBalance = await pub.readContract({
	address: PATH_USD as `0x${string}`,
	abi: tip20Abi,
	functionName: "balanceOf",
	args: [deployer.address],
});
console.log(`pathUSD balance: ${Number(pathBalance) / 1e6}`);

if (usdcBalance === 0n) {
	console.log("No USDC.e to swap. Fund the deployer first.");
	process.exit(1);
}

// Step 2: Quote swap
const swapAmount = usdcBalance; // swap all USDC.e
console.log(`\nQuoting swap of ${Number(swapAmount) / 1e6} USDC.e → pathUSD...`);

const quote = await pub.readContract({
	address: DEX as `0x${string}`,
	abi: dexAbi,
	functionName: "quoteSwapExactAmountIn",
	args: [
		USDC_E as `0x${string}`,
		PATH_USD as `0x${string}`,
		BigInt(swapAmount) as unknown as bigint,
	],
});
console.log(`Expected output: ${Number(quote) / 1e6} pathUSD`);

// Step 3: Approve DEX to spend USDC.e
console.log("\nApproving DEX...");
const approveHash = await wallet.writeContract({
	address: USDC_E as `0x${string}`,
	abi: tip20Abi,
	functionName: "approve",
	args: [DEX as `0x${string}`, swapAmount],
});
await pub.waitForTransactionReceipt({ hash: approveHash });
console.log("Approved ✓");

// Step 4: Swap USDC.e → pathUSD
const minOut = (BigInt(quote) * 99n) / 100n; // 1% slippage
console.log(`Swapping with minOut: ${Number(minOut) / 1e6} pathUSD...`);

const swapHash = await wallet.writeContract({
	address: DEX as `0x${string}`,
	abi: dexAbi,
	functionName: "swapExactAmountIn",
	args: [
		USDC_E as `0x${string}`,
		PATH_USD as `0x${string}`,
		BigInt(swapAmount) as unknown as bigint,
		BigInt(minOut) as unknown as bigint,
	],
});
const swapReceipt = await pub.waitForTransactionReceipt({ hash: swapHash });
console.log(`Swap tx: ${swapHash} (${swapReceipt.status})`);

// Check new pathUSD balance
const newPathBalance = await pub.readContract({
	address: PATH_USD as `0x${string}`,
	abi: tip20Abi,
	functionName: "balanceOf",
	args: [deployer.address],
});
console.log(`\npathUSD balance after swap: ${Number(newPathBalance) / 1e6}`);

// Step 5: Deploy GuardianFactory
console.log("\nDeploying GuardianFactory...");
const artifact = JSON.parse(
	readFileSync(
		"/Users/ivorobiev/Desktop/repos/spire/contracts/out/GuardianFactory.sol/GuardianFactory.json",
		"utf-8",
	),
);

const deployHash = await wallet.deployContract({
	abi: artifact.abi,
	bytecode: artifact.bytecode.object as `0x${string}`,
	gas: 3_000_000n,
});

console.log(`Deploy tx: ${deployHash}`);
console.log(`Explorer: https://explorer.tempo.xyz/tx/${deployHash}`);

const receipt = await pub.waitForTransactionReceipt({ hash: deployHash });

if (receipt.status === "reverted") {
	console.log("Deploy REVERTED!");
	process.exit(1);
}

console.log(`\n✅ GuardianFactory deployed at: ${receipt.contractAddress}`);
console.log(`Block: ${receipt.blockNumber}`);
