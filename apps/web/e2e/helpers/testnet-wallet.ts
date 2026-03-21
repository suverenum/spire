/**
 * Testnet wallet utilities for E2E integration tests.
 * Uses Tempo Moderato testnet faucet for funding.
 */
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { tempoModerato } from "viem/chains";

const RPC_URL = "https://rpc.moderato.tempo.xyz";
const ALPHA_USD = "0x20c0000000000000000000000000000000000001" as const;

const Tip20Abi = parseAbi([
	"function balanceOf(address) view returns (uint256)",
	"function transfer(address to, uint256 amount) external returns (bool)",
]);

export interface TestnetWallet {
	privateKey: `0x${string}`;
	address: `0x${string}`;
}

/**
 * Create a fresh testnet wallet with a random private key.
 */
export function createTestWallet(): TestnetWallet {
	const privateKey = generatePrivateKey();
	const account = privateKeyToAccount(privateKey);
	return { privateKey, address: account.address };
}

/**
 * Create and fund a testnet wallet. Returns when it has AlphaUSD.
 */
export async function createFundedWallet(): Promise<TestnetWallet> {
	const privateKey = generatePrivateKey();
	const account = privateKeyToAccount(privateKey);

	const publicClient = createPublicClient({
		chain: tempoModerato,
		transport: http(RPC_URL),
	});

	// Fund via Tempo faucet
	const { Actions } = await import("viem/tempo");
	await Actions.faucet.fundSync(publicClient, {
		account,
		timeout: 60_000,
	});

	return { privateKey, address: account.address };
}

/**
 * Get AlphaUSD balance for an address.
 */
export async function getTokenBalance(address: `0x${string}`): Promise<bigint> {
	const publicClient = createPublicClient({
		chain: tempoModerato,
		transport: http(RPC_URL),
	});

	return publicClient.readContract({
		address: ALPHA_USD,
		abi: Tip20Abi,
		functionName: "balanceOf",
		args: [address],
	});
}

/**
 * Transfer AlphaUSD tokens between accounts.
 */
export async function transferTokens(
	fromKey: `0x${string}`,
	to: `0x${string}`,
	amount: bigint,
): Promise<`0x${string}`> {
	const account = privateKeyToAccount(fromKey);
	const walletClient = createWalletClient({
		account,
		chain: tempoModerato,
		transport: http(RPC_URL),
	});
	const publicClient = createPublicClient({
		chain: tempoModerato,
		transport: http(RPC_URL),
	});

	const hash = await walletClient.writeContract({
		address: ALPHA_USD,
		abi: Tip20Abi,
		functionName: "transfer",
		args: [to, amount],
	});

	await publicClient.waitForTransactionReceipt({ hash });
	return hash;
}

export { ALPHA_USD, RPC_URL };
