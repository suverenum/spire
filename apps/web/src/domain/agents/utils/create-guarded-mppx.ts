// @ts-nocheck
// This file is an agent-side utility that depends on 'mppx' (not a Goldhord dependency).
// It's included here as reference — agents copy this into their own projects.

/**
 * createGuardedMppx — Agent-side utility for making MPP payments through a Guardian contract.
 *
 * Usage:
 *   import { createGuardedMppx } from './create-guarded-mppx'
 *
 *   const mppx = createGuardedMppx({
 *     agentKey: '0x...',        // From Agent Bank dashboard
 *     guardianAddress: '0x...', // From Agent Bank dashboard
 *   })
 *
 *   const res = await mppx.fetch('https://vendor.example.com/api', { method: 'POST', body })
 */

import { Credential } from "mppx";
import { Mppx, tempo } from "mppx/client";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { tempo as tempoChain } from "viem/chains";

const GUARDIAN_ABI = parseAbi(["function pay(address token, address to, uint256 amount) external"]);

const DEFAULT_RPC_URL = "https://rpc.moderato.tempo.xyz";
const DEFAULT_CHAIN_ID = 42431;

export interface GuardedMppxParams {
	/** Agent private key (hex string with 0x prefix) */
	agentKey: `0x${string}`;
	/** Guardian contract address */
	guardianAddress: `0x${string}`;
	/** Tempo RPC URL (defaults to Moderato testnet) */
	rpcUrl?: string;
	/** Chain ID (defaults to 42431 / Moderato) */
	chainId?: number;
}

/**
 * Creates an mppx client that routes all payments through the Guardian contract.
 * The Guardian enforces on-chain spending rules (per-tx cap, daily limit, vendor allowlist).
 *
 * How it works:
 * 1. Agent makes a request via mppx.fetch()
 * 2. Server responds with 402 + payment challenge
 * 3. onChallenge intercepts: calls Guardian.pay() instead of direct USDC.transfer()
 * 4. Guardian checks all rules on-chain, then executes the transfer
 * 5. mppx retries with push-mode credential (tx hash)
 * 6. Server verifies the Transfer event and returns 200 OK
 */
export function createGuardedMppx(params: GuardedMppxParams) {
	const rpcUrl = params.rpcUrl ?? DEFAULT_RPC_URL;
	const chainId = params.chainId ?? DEFAULT_CHAIN_ID;

	const account = privateKeyToAccount(params.agentKey);

	const walletClient = createWalletClient({
		account,
		chain: { ...tempoChain, id: chainId } as typeof tempoChain,
		transport: http(rpcUrl),
	});

	const publicClient = createPublicClient({
		chain: { ...tempoChain, id: chainId } as typeof tempoChain,
		transport: http(rpcUrl),
	});

	return Mppx.create({
		polyfill: false,
		methods: [
			tempo({
				account,
				getClient: () => publicClient,
			}),
		],

		async onChallenge(challenge) {
			const { amount, currency, recipient } = challenge.request;

			// Route through Guardian contract instead of direct transfer
			const hash = await walletClient.writeContract({
				address: params.guardianAddress,
				abi: GUARDIAN_ABI,
				functionName: "pay",
				args: [currency as `0x${string}`, recipient as `0x${string}`, BigInt(amount)],
			});

			// Wait for on-chain confirmation
			await publicClient.waitForTransactionReceipt({ hash });

			// Build push-mode credential (standard MPP format)
			const credential = Credential.from({
				challenge,
				payload: { hash, type: "hash" as const },
				source: `did:pkh:eip155:${chainId}:${account.address}`,
			});

			return Credential.serialize(credential);
		},
	});
}
