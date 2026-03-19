#!/usr/bin/env npx tsx
// @ts-nocheck
// This script runs from the tempo-mppx directory (which has mppx as a dependency).
// It is NOT part of the Goldhord web app build — it's a standalone demo tool.
/**
 * Agent Bank — Hackathon Demo Script
 *
 * Demonstrates the full Guardian contract flow:
 * 1. Deploy Guardian via factory on Tempo Moderato testnet
 * 2. Fund Guardian with pathUSD
 * 3. Make a payment to a local MPP server (proves flow works)
 * 4. Make a payment to mpp.dev/api/ping/paid (real MPP endpoint)
 * 5. Try a blocked vendor → Guardian reverts "Recipient not allowed"
 * 6. Try an over-limit payment → Guardian reverts "Exceeds per-tx limit"
 *
 * Usage:
 *   npx tsx scripts/demo.ts
 *   # or
 *   bun run scripts/demo.ts
 */

import http from "node:http";
import { Credential } from "./src/index.js";
import { Mppx as Mppx_client, tempo as tempo_client } from "./src/client/index.js";
import { Mppx as Mppx_server, tempo as tempo_server } from "./src/server/index.js";
import { createPublicClient, createWalletClient, parseAbi, http as viemHttp } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { readContract, waitForTransactionReceipt } from "viem/actions";
import { tempoModerato } from "viem/chains";
import { Actions } from "viem/tempo";

// ─── ANSI Colors ──────────────────────────────────────────────────
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function log(msg: string) {
	console.log(msg);
}
function step(n: number, title: string) {
	log(`\n${BOLD}${BLUE}━━━ Step ${n}: ${title} ━━━${RESET}`);
}
function ok(msg: string) {
	log(`  ${GREEN}✓${RESET} ${msg}`);
}
function fail(msg: string) {
	log(`  ${RED}✗${RESET} ${msg}`);
}
function info(msg: string) {
	log(`  ${DIM}${msg}${RESET}`);
}
function spending(spent: string, daily: string, total: string, cap: string) {
	log(`  ${CYAN}Spent: $${spent} / $${daily} daily │ $${total} / $${cap} lifetime${RESET}`);
}

// ─── Config ───────────────────────────────────────────────────────
const RPC_URL = "https://rpc.moderato.tempo.xyz";
const EXPLORER = "https://explore.moderato.tempo.xyz";
const CHAIN_ID = 42431;
const PATHUSD = "0x20c0000000000000000000000000000000000000" as const;

const GUARDIAN_FACTORY = "0x8f2958bC87f12c4556fb5a43A03eE30B1EEca9A8" as const;

const MAX_PER_TX = 2_000_000n; // $2
const DAILY_LIMIT = 10_000_000n; // $10
const SPENDING_CAP = 50_000_000n; // $50

const GuardianFactoryAbi = parseAbi([
	"function createGuardian(address agent, uint256 maxPerTx, uint256 dailyLimit, uint256 spendingCap, bytes32 salt) external returns (address guardian)",
	"event GuardianCreated(address indexed guardian, address indexed owner, address indexed agent, uint256 maxPerTx, uint256 dailyLimit, uint256 spendingCap)",
]);

const GuardianAbi = parseAbi([
	"function pay(address token, address to, uint256 amount) external",
	"function proposePay(address token, address to, uint256 amount) external returns (uint256 proposalId, bool executed)",
	"function approvePay(uint256 proposalId) external",
	"function addRecipient(address r) external",
	"function addToken(address t) external",
	"function spentToday() external view returns (uint256)",
	"function totalSpent() external view returns (uint256)",
	"function proposalCount() external view returns (uint256)",
]);

const Tip20Abi = parseAbi([
	"function transfer(address to, uint256 amount) external returns (bool)",
	"function balanceOf(address account) external view returns (uint256)",
]);

// ─── Helpers ──────────────────────────────────────────────────────
function fmt(raw: bigint): string {
	return (Number(raw) / 1_000_000).toFixed(2);
}

function shortAddr(addr: string): string {
	return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

async function createLocalMppServer(
	vendorAccount: ReturnType<typeof privateKeyToAccount>,
	publicClient: ReturnType<typeof createPublicClient>,
	currency: `0x${string}`,
): Promise<{ url: string; close: () => void }> {
	const server = Mppx_server.create({
		methods: [
			tempo_server.charge({
				getClient: () => publicClient as never,
				currency,
				account: vendorAccount,
			}),
		],
		realm: "demo-vendor.agentbank.xyz",
		secretKey: "demo-secret-key",
	});

	return new Promise((resolve) => {
		const httpServer = http.createServer(async (req, res) => {
			const url = new URL(req.url || "/", `http://localhost`);
			if (url.pathname === "/api/paid") {
				const result = await Mppx_server.toNodeListener(
					server.charge({ amount: "0.50", decimals: 6 }),
				)(req, res);
				if (result.status === 402) return;
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify({
						message: "Payment accepted! Here is your premium content.",
						vendor: "Agent Bank Demo Server",
					}),
				);
			} else {
				res.writeHead(200);
				res.end("Agent Bank Demo Server - visit /api/paid");
			}
		});

		httpServer.listen(0, () => {
			const { port } = httpServer.address() as { port: number };
			resolve({
				url: `http://localhost:${port}`,
				close: () => httpServer.close(),
			});
		});
	});
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
	log(`\n${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${RESET}`);
	log(`${BOLD}${GREEN}║  AGENT BANK — On-Chain Guardrails for AI Agents      ║${RESET}`);
	log(`${BOLD}${GREEN}║  Live Demo on Tempo Moderato Testnet                 ║${RESET}`);
	log(`${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${RESET}`);

	// ─── Setup ────────────────────────────────────────────────────
	const ownerKey = generatePrivateKey();
	const ownerAccount = privateKeyToAccount(ownerKey);
	const agentKey = generatePrivateKey();
	const agentAccount = privateKeyToAccount(agentKey);
	const vendorKey = generatePrivateKey();
	const vendorAccount = privateKeyToAccount(vendorKey);

	const publicClient = createPublicClient({
		chain: tempoModerato,
		transport: viemHttp(RPC_URL),
	});

	const ownerWallet = createWalletClient({
		account: ownerAccount,
		chain: tempoModerato,
		transport: viemHttp(RPC_URL),
	});

	const agentWallet = createWalletClient({
		account: agentAccount,
		chain: tempoModerato,
		transport: viemHttp(RPC_URL),
	});

	info(`Owner:  ${ownerAccount.address}`);
	info(`Agent:  ${agentAccount.address}`);
	info(`Vendor: ${vendorAccount.address}`);

	// Fund accounts via faucet
	log(`\n${DIM}Funding accounts via testnet faucet...${RESET}`);
	await Actions.faucet.fundSync(publicClient, {
		account: ownerAccount,
		timeout: 60_000,
	});
	await Actions.faucet.fundSync(publicClient, {
		account: agentAccount,
		timeout: 60_000,
	});
	await Actions.faucet.fundSync(publicClient, {
		account: vendorAccount,
		timeout: 60_000,
	});
	ok("Accounts funded via faucet");

	// ─── Step 1: Deploy Guardian ──────────────────────────────────
	step(1, "Deploy Guardian Contract");
	info(
		`Rules: $${fmt(MAX_PER_TX)}/tx cap, $${fmt(DAILY_LIMIT)}/day limit, $${fmt(SPENDING_CAP)} lifetime cap`,
	);

	const salt =
		`0x${Buffer.from(`demo-${Date.now()}`).toString("hex").padEnd(64, "0")}` as `0x${string}`;

	const deployHash = await ownerWallet.writeContract({
		address: GUARDIAN_FACTORY,
		abi: GuardianFactoryAbi,
		functionName: "createGuardian",
		args: [agentAccount.address, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, salt],
	});

	const deployReceipt = await waitForTransactionReceipt(publicClient, {
		hash: deployHash,
	});

	// Parse the GuardianCreated event to get the actual guardian address
	// Event: GuardianCreated(address indexed guardian, address indexed owner, address indexed agent, ...)
	const GUARDIAN_CREATED_TOPIC =
		"0xf52734e59a4bb70606795fad022ed2bf9b5b3d230d44f422dea3f9eb67edc913";
	const createdLog = deployReceipt.logs.find((l) => l.topics[0] === GUARDIAN_CREATED_TOPIC);
	const guardianAddr = createdLog
		? (`0x${createdLog.topics[1]?.slice(26)}` as `0x${string}`)
		: deployReceipt.logs[0]?.address || ("0x" as `0x${string}`);

	ok(`Guardian deployed: ${YELLOW}${guardianAddr}${RESET}`);
	info(`Explorer: ${EXPLORER}/tx/${deployHash}`);

	// Configure allowlists
	await ownerWallet.writeContract({
		address: guardianAddr,
		abi: GuardianAbi,
		functionName: "addRecipient",
		args: [vendorAccount.address],
	});
	await ownerWallet.writeContract({
		address: guardianAddr,
		abi: GuardianAbi,
		functionName: "addToken",
		args: [PATHUSD],
	});
	ok("Allowlists configured: vendor + pathUSD");

	// ─── Step 2: Fund Guardian ────────────────────────────────────
	step(2, "Fund Guardian with pathUSD");

	const fundHash = await ownerWallet.writeContract({
		address: PATHUSD,
		abi: Tip20Abi,
		functionName: "transfer",
		args: [guardianAddr, 10_000_000n],
	});
	await waitForTransactionReceipt(publicClient, { hash: fundHash });

	const balance = await readContract(publicClient, {
		address: PATHUSD,
		abi: Tip20Abi,
		functionName: "balanceOf",
		args: [guardianAddr],
	});
	ok(`Funded: $${fmt(balance)} pathUSD`);
	info(`Explorer: ${EXPLORER}/tx/${fundHash}`);

	// ─── Step 3: Payment to local server ──────────────────────────
	step(3, "Agent pays local MPP server (proves Guardian + mppx flow)");

	const localServer = await createLocalMppServer(vendorAccount, publicClient, PATHUSD);
	info(`Local server running at ${localServer.url}/api/paid`);

	const mppx = Mppx_client.create({
		polyfill: false,
		methods: [
			tempo_client({
				account: agentAccount,
				getClient: () => publicClient as never,
			}),
		],
		async onChallenge(challenge) {
			const { amount, currency, recipient } = challenge.request;
			info(`  402 Challenge: pay ${fmt(BigInt(amount))} pathUSD to ${shortAddr(recipient)}`);
			info("  Routing through Guardian.pay()...");

			const hash = await agentWallet.writeContract({
				address: guardianAddr,
				abi: GuardianAbi,
				functionName: "pay",
				args: [currency as `0x${string}`, recipient as `0x${string}`, BigInt(amount)],
			});
			await waitForTransactionReceipt(publicClient, { hash });

			info(`  ${GREEN}Guardian approved${RESET} → tx: ${shortAddr(hash)}`);
			info(`  Explorer: ${EXPLORER}/tx/${hash}`);

			return Credential.serialize(
				Credential.from({
					challenge,
					payload: { hash, type: "hash" as const },
					source: `did:pkh:eip155:${CHAIN_ID}:${agentAccount.address}`,
				}),
			);
		},
	});

	const localResponse = await mppx.fetch(`${localServer.url}/api/paid`);
	if (localResponse.status === 200) {
		const body = await localResponse.json();
		ok(`Payment accepted! Response: "${(body as Record<string, string>).message}"`);
	} else {
		fail(`Unexpected status: ${localResponse.status}`);
	}

	const spentAfter3 = await readContract(publicClient, {
		address: guardianAddr,
		abi: GuardianAbi,
		functionName: "spentToday",
	});
	const totalAfter3 = await readContract(publicClient, {
		address: guardianAddr,
		abi: GuardianAbi,
		functionName: "totalSpent",
	});
	spending(fmt(spentAfter3), fmt(DAILY_LIMIT), fmt(totalAfter3), fmt(SPENDING_CAP));

	localServer.close();

	// ─── Step 4: Try BLOCKED vendor ───────────────────────────────
	step(4, "Agent tries BLOCKED vendor (not in allowlist)");

	const blockedVendorKey = generatePrivateKey();
	const blockedVendor = privateKeyToAccount(blockedVendorKey);
	info(`Blocked vendor: ${shortAddr(blockedVendor.address)} (NOT in allowlist)`);

	try {
		await agentWallet.writeContract({
			address: guardianAddr,
			abi: GuardianAbi,
			functionName: "pay",
			args: [PATHUSD, blockedVendor.address, 100_000n],
		});
		fail("Should have reverted!");
	} catch (err: unknown) {
		const e = err as { cause?: { reason?: string }; shortMessage?: string; message?: string };
		const reason = e?.cause?.reason || e?.shortMessage || e?.message || "Unknown";
		ok(`${RED}Guardian REVERTED: "${reason}"${RESET}`);
		ok("Agent cannot pay unauthorized vendors — enforced ON-CHAIN");
	}

	// ─── Step 5: Try OVER-LIMIT payment ───────────────────────────
	step(5, "Agent tries payment exceeding per-tx cap ($5 > $2 cap)");

	try {
		await agentWallet.writeContract({
			address: guardianAddr,
			abi: GuardianAbi,
			functionName: "pay",
			args: [PATHUSD, vendorAccount.address, 5_000_000n],
		});
		fail("Should have reverted!");
	} catch (err: unknown) {
		const e = err as { cause?: { reason?: string }; shortMessage?: string; message?: string };
		const reason = e?.cause?.reason || e?.shortMessage || e?.message || "Unknown";
		ok(`${RED}Guardian REVERTED: "${reason}"${RESET}`);
		ok("Agent cannot exceed spending limits — enforced ON-CHAIN");
	}

	// ─── Step 6: Approval flow — agent proposes, owner approves ──
	step(6, "Agent proposes over-limit payment → owner approves on-chain");

	info("Agent calls proposePay($5) — exceeds $2 per-tx cap...");
	const proposeTx = await agentWallet.writeContract({
		address: guardianAddr,
		abi: GuardianAbi,
		functionName: "proposePay",
		args: [PATHUSD, vendorAccount.address, 5_000_000n],
	});
	await waitForTransactionReceipt(publicClient, { hash: proposeTx });

	const proposalCount = await readContract(publicClient, {
		address: guardianAddr,
		abi: GuardianAbi,
		functionName: "proposalCount",
	});
	ok(`Proposal #${proposalCount} created on-chain (status: pending)`);
	info(`Instead of reverting, the Guardian queues it for owner approval`);
	info(`Explorer: ${EXPLORER}/tx/${proposeTx}`);

	// Owner approves
	info("");
	info("Owner reviews and approves the proposal...");
	const approveTx = await ownerWallet.writeContract({
		address: guardianAddr,
		abi: GuardianAbi,
		functionName: "approvePay",
		args: [proposalCount],
	});
	await waitForTransactionReceipt(publicClient, { hash: approveTx });
	ok(`${GREEN}Owner APPROVED${RESET} → $5.00 payment executed on-chain`);
	info(`Explorer: ${EXPLORER}/tx/${approveTx}`);

	// Show final spending
	const finalSpent = await readContract(publicClient, {
		address: guardianAddr,
		abi: GuardianAbi,
		functionName: "totalSpent",
	});
	spending(
		fmt(await readContract(publicClient, { address: guardianAddr, abi: GuardianAbi, functionName: "spentToday" })),
		fmt(DAILY_LIMIT),
		fmt(finalSpent),
		fmt(SPENDING_CAP),
	);

	// ─── Summary ──────────────────────────────────────────────────
	log(`\n${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${RESET}`);
	log(`${BOLD}${GREEN}║  Demo Complete!                                      ║${RESET}`);
	log(`${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${RESET}`);
	log("");
	ok("Guardian contract deployed with spending rules");
	ok("Agent paid local MPP server through Guardian");
	ok("Guardian blocked unauthorized vendor on-chain");
	ok("Guardian blocked over-limit payment on-chain");
	ok("Agent proposed over-limit payment → owner approved on-chain");
	log("");
	log(`${BOLD}All rules enforced ON-CHAIN. Even a compromised agent key${RESET}`);
	log(`${BOLD}can only spend within the Guardian's rules.${RESET}`);
	log(`${BOLD}Over-limit payments need owner approval — not blocked, just governed.${RESET}`);
	log("");
	info(`Guardian: ${guardianAddr}`);
	info(`Explorer: ${EXPLORER}/address/${guardianAddr}`);
	log("");
}

main().catch((err) => {
	console.error(`\n${RED}Demo failed:${RESET}`, err.message || err);
	process.exit(1);
});
