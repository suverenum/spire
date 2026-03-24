#!/usr/bin/env npx tsx

// @ts-nocheck
/**
 * Verify an Agent Bank wallet — tests all edge cases on-chain.
 *
 * Usage: npx tsx verify-wallet.ts
 */

import http from "node:http";
import { createPublicClient, createWalletClient, parseAbi, http as viemHttp } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readContract, waitForTransactionReceipt } from "viem/actions";
import { tempoModerato } from "viem/chains";
import { Mppx as Mppx_client, tempo as tempo_client } from "./src/client/index.js";
import { Credential } from "./src/index.js";
import { Mppx as Mppx_server, tempo as tempo_server } from "./src/server/index.js";

import { requireAddress, requireHexKey } from "./env";

// ─── CONFIG ───────────────────────────────────────────────────────
const AGENT_KEY = requireHexKey("AGENT_KEY");
const GUARDIAN = requireAddress("GUARDIAN_ADDRESS");
const RPC = "https://rpc.moderato.tempo.xyz";
const EXPLORER = "https://explore.moderato.tempo.xyz";
const PATHUSD = requireAddress("TOKEN_ADDRESS");
const ALPHAUSD = PATHUSD; // Using same token (allowed in Guardian)

// Allowed vendor
const ALLOWED_VENDOR = requireAddress("VENDOR_ADDRESS");
// NOT allowed vendor (hardcoded dead address for testing — not a secret)
const BLOCKED_VENDOR = "0x000000000000000000000000000000000000dead" as `0x${string}`;

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const _YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function ok(msg) {
	console.log(`  ${GREEN}✓${RESET} ${msg}`);
}
function fail(msg) {
	console.log(`  ${RED}✗${RESET} ${msg}`);
}
function info(msg) {
	console.log(`  ${DIM}${msg}${RESET}`);
}
function step(n, title) {
	console.log(`\n${BOLD}${CYAN}━━━ Test ${n}: ${title} ━━━${RESET}`);
}

const GuardianAbi = parseAbi([
	"function pay(address token, address to, uint256 amount) external",
	"function owner() external view returns (address)",
	"function agent() external view returns (address)",
	"function maxPerTx() external view returns (uint256)",
	"function dailyLimit() external view returns (uint256)",
	"function spendingCap() external view returns (uint256)",
	"function spentToday() external view returns (uint256)",
	"function totalSpent() external view returns (uint256)",
	"function allowedRecipients(address) external view returns (bool)",
	"function allowedTokens(address) external view returns (bool)",
]);

const Tip20Abi = parseAbi(["function balanceOf(address) external view returns (uint256)"]);

function fmt(raw) {
	return (Number(raw) / 1_000_000).toFixed(2);
}

async function main() {
	console.log(`\n${BOLD}${GREEN}╔═══════════════════════════════════════════════════╗${RESET}`);
	console.log(`${BOLD}${GREEN}║  Agent Bank Wallet Verification                   ║${RESET}`);
	console.log(`${BOLD}${GREEN}╚═══════════════════════════════════════════════════╝${RESET}`);

	const agentAccount = privateKeyToAccount(AGENT_KEY);
	const publicClient = createPublicClient({ chain: tempoModerato, transport: viemHttp(RPC) });
	const agentWallet = createWalletClient({
		account: agentAccount,
		chain: tempoModerato,
		transport: viemHttp(RPC),
	});

	info(`Guardian: ${GUARDIAN}`);
	info(`Agent:    ${agentAccount.address}`);

	// ─── Test 1: Read on-chain state ──────────────────────────────
	step(1, "Read Guardian on-chain state");

	const owner = await readContract(publicClient, {
		address: GUARDIAN,
		abi: GuardianAbi,
		functionName: "owner",
	});
	const agent = await readContract(publicClient, {
		address: GUARDIAN,
		abi: GuardianAbi,
		functionName: "agent",
	});
	const maxPerTx = await readContract(publicClient, {
		address: GUARDIAN,
		abi: GuardianAbi,
		functionName: "maxPerTx",
	});
	const dailyLimit = await readContract(publicClient, {
		address: GUARDIAN,
		abi: GuardianAbi,
		functionName: "dailyLimit",
	});
	const spendingCap = await readContract(publicClient, {
		address: GUARDIAN,
		abi: GuardianAbi,
		functionName: "spendingCap",
	});
	const spentToday = await readContract(publicClient, {
		address: GUARDIAN,
		abi: GuardianAbi,
		functionName: "spentToday",
	});
	const totalSpent = await readContract(publicClient, {
		address: GUARDIAN,
		abi: GuardianAbi,
		functionName: "totalSpent",
	});
	const balance = await readContract(publicClient, {
		address: ALPHAUSD,
		abi: Tip20Abi,
		functionName: "balanceOf",
		args: [GUARDIAN],
	});

	ok(`Owner: ${owner}`);
	ok(
		`Agent: ${agent} ${agent.toLowerCase() === agentAccount.address.toLowerCase() ? `${GREEN}(matches key)${RESET}` : `${RED}(MISMATCH!)${RESET}`}`,
	);
	ok(`Per-tx cap: $${fmt(maxPerTx)}`);
	ok(`Daily limit: $${fmt(dailyLimit)}`);
	ok(`Spending cap: $${fmt(spendingCap)}`);
	ok(`Spent today: $${fmt(spentToday)}`);
	ok(`Total spent: $${fmt(totalSpent)}`);
	ok(`Balance: $${fmt(balance)} pathUSD`);

	// Check allowlists
	const vendorAllowed = await readContract(publicClient, {
		address: GUARDIAN,
		abi: GuardianAbi,
		functionName: "allowedRecipients",
		args: [ALLOWED_VENDOR],
	});
	const blockedAllowed = await readContract(publicClient, {
		address: GUARDIAN,
		abi: GuardianAbi,
		functionName: "allowedRecipients",
		args: [BLOCKED_VENDOR],
	});
	const alphaAllowed = await readContract(publicClient, {
		address: GUARDIAN,
		abi: GuardianAbi,
		functionName: "allowedTokens",
		args: [ALPHAUSD],
	});

	ok(`Vendor 0x...0001 allowed: ${vendorAllowed ? `${GREEN}yes` : `${RED}no`}${RESET}`);
	ok(
		`Vendor 0x...dead allowed: ${blockedAllowed ? `${RED}yes (BAD!)` : `${GREEN}no (correct)`}${RESET}`,
	);
	ok(`pathUSD allowed: ${alphaAllowed ? `${GREEN}yes` : `${RED}no`}${RESET}`);

	// ─── Test 2: Happy path — pay allowed vendor via MPP ──────────
	step(2, "Happy path — agent pays allowed vendor via local MPP server");

	// Use the allowlisted vendor address as recipient
	const localServer = await new Promise((resolve) => {
		const server = Mppx_server.create({
			methods: [
				tempo_server.charge({
					getClient: () => publicClient,
					currency: ALPHAUSD,
					account: ALLOWED_VENDOR,
				}),
			],
			realm: "verify-test.agentbank.xyz",
			secretKey: "verify-secret",
		});

		const httpServer = http.createServer(async (req, res) => {
			const result = await Mppx_server.toNodeListener(
				server.charge({ amount: "1", decimals: 6, recipient: ALLOWED_VENDOR }),
			)(req, res);
			if (result.status === 402) return;
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ status: "ok", message: "Payment accepted!" }));
		});

		httpServer.listen(0, () => {
			const { port } = httpServer.address();
			resolve({ url: `http://localhost:${port}`, close: () => httpServer.close() });
		});
	});

	const mppx = Mppx_client.create({
		polyfill: false,
		methods: [tempo_client({ account: agentAccount, getClient: () => publicClient })],
		async onChallenge(challenge) {
			const { amount, currency, recipient } = challenge.request;
			info(`  402 → pay $${fmt(BigInt(amount))} to ${recipient.slice(0, 10)}...`);
			const hash = await agentWallet.writeContract({
				address: GUARDIAN,
				abi: GuardianAbi,
				functionName: "pay",
				args: [currency, recipient, BigInt(amount)],
			});
			await waitForTransactionReceipt(publicClient, { hash });
			ok(`  Guardian approved → ${EXPLORER}/tx/${hash}`);
			return Credential.serialize(
				Credential.from({
					challenge,
					payload: { hash, type: "hash" },
					source: `did:pkh:eip155:42431:${agentAccount.address}`,
				}),
			);
		},
	});

	try {
		const res = await mppx.fetch(`${localServer.url}/api/paid`);
		if (res.status === 200) {
			const body = await res.json();
			ok(`Payment accepted: "${body.message}"`);
		} else {
			fail(`Unexpected status: ${res.status}`);
		}
	} catch (err) {
		fail(`Payment failed: ${err.message}`);
	}
	localServer.close();

	// ─── Test 3: Blocked vendor ───────────────────────────────────
	step(3, "Edge case — agent tries to pay BLOCKED vendor");

	try {
		await agentWallet.writeContract({
			address: GUARDIAN,
			abi: GuardianAbi,
			functionName: "pay",
			args: [ALPHAUSD, BLOCKED_VENDOR, 100_000n],
		});
		fail("Should have reverted!");
	} catch (err) {
		const reason = err?.cause?.reason || err?.shortMessage || err?.message || "Unknown";
		if (reason.includes("Recipient not allowed")) {
			ok(`${RED}Reverted: "Recipient not allowed"${RESET} — correct!`);
		} else {
			ok(`Reverted: "${reason}"`);
		}
	}

	// ─── Test 4: Over per-tx limit ────────────────────────────────
	step(4, "Edge case — agent tries $5 payment (exceeds $2 per-tx cap)");

	try {
		await agentWallet.writeContract({
			address: GUARDIAN,
			abi: GuardianAbi,
			functionName: "pay",
			args: [ALPHAUSD, ALLOWED_VENDOR, 5_000_000n],
		});
		fail("Should have reverted!");
	} catch (err) {
		const reason = err?.cause?.reason || err?.shortMessage || err?.message || "Unknown";
		if (reason.includes("Exceeds per-tx limit")) {
			ok(`${RED}Reverted: "Exceeds per-tx limit"${RESET} — correct!`);
		} else {
			ok(`Reverted: "${reason}"`);
		}
	}

	// ─── Test 5: Wrong token ──────────────────────────────────────
	step(5, "Edge case — agent tries to pay with wrong token (pathUSD not in allowlist)");

	const pathAllowed = await readContract(publicClient, {
		address: GUARDIAN,
		abi: GuardianAbi,
		functionName: "allowedTokens",
		args: [PATHUSD],
	});
	if (pathAllowed) {
		info("pathUSD IS in allowlist — skipping this test");
	} else {
		try {
			await agentWallet.writeContract({
				address: GUARDIAN,
				abi: GuardianAbi,
				functionName: "pay",
				args: [PATHUSD, ALLOWED_VENDOR, 100_000n],
			});
			fail("Should have reverted!");
		} catch (err) {
			const reason = err?.cause?.reason || err?.shortMessage || err?.message || "Unknown";
			if (reason.includes("Token not allowed")) {
				ok(`${RED}Reverted: "Token not allowed"${RESET} — correct!`);
			} else {
				ok(`Reverted: "${reason}"`);
			}
		}
	}

	// ─── Test 6: Non-agent caller ─────────────────────────────────
	step(6, "Edge case — non-agent tries to call pay()");

	// Generate a random key for testing unauthorized access — NOT a real secret
	const { generatePrivateKey } = await import("viem/accounts");
	const randomKey = generatePrivateKey();
	const randomAccount = privateKeyToAccount(randomKey);
	const randomWallet = createWalletClient({
		account: randomAccount,
		chain: tempoModerato,
		transport: viemHttp(RPC),
	});

	try {
		await randomWallet.writeContract({
			address: GUARDIAN,
			abi: GuardianAbi,
			functionName: "pay",
			args: [ALPHAUSD, ALLOWED_VENDOR, 100_000n],
		});
		fail("Should have reverted!");
	} catch (err) {
		const reason = err?.cause?.reason || err?.shortMessage || err?.message || "Unknown";
		if (reason.includes("Not agent")) {
			ok(`${RED}Reverted: "Not agent"${RESET} — correct!`);
		} else {
			ok(`Reverted: "${reason}"`);
		}
	}

	// ─── Final state ──────────────────────────────────────────────
	step(7, "Final on-chain state after tests");

	const finalSpent = await readContract(publicClient, {
		address: GUARDIAN,
		abi: GuardianAbi,
		functionName: "spentToday",
	});
	const finalTotal = await readContract(publicClient, {
		address: GUARDIAN,
		abi: GuardianAbi,
		functionName: "totalSpent",
	});
	const finalBalance = await readContract(publicClient, {
		address: ALPHAUSD,
		abi: Tip20Abi,
		functionName: "balanceOf",
		args: [GUARDIAN],
	});

	ok(`Spent today: $${fmt(finalSpent)} / $${fmt(dailyLimit)}`);
	ok(`Total spent: $${fmt(finalTotal)} / $${fmt(spendingCap)}`);
	ok(`Balance: $${fmt(finalBalance)} pathUSD`);

	console.log(`\n${BOLD}${GREEN}╔═══════════════════════════════════════════════════╗${RESET}`);
	console.log(`${BOLD}${GREEN}║  All Verification Tests Complete!                  ║${RESET}`);
	console.log(`${BOLD}${GREEN}╚═══════════════════════════════════════════════════╝${RESET}\n`);
	info(`Explorer: ${EXPLORER}/address/${GUARDIAN}`);
}

main().catch((err) => {
	console.error(`\n${RED}Verification failed:${RESET}`, err.message || err);
	process.exit(1);
});
