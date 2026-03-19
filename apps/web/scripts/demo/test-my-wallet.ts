#!/usr/bin/env npx tsx
import http from "node:http";
import { createPublicClient, createWalletClient, parseAbi, http as viemHttp } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readContract, waitForTransactionReceipt } from "viem/actions";
import { tempoModerato } from "viem/chains";
import { Mppx as Mppx_client, tempo as tempo_client } from "./src/client/index.js";
// @ts-nocheck
/**
 * Test YOUR Marketing Bot wallet with a real MPP payment flow.
 */
import { Credential } from "./src/index.js";
import { Mppx as Mppx_server, tempo as tempo_server } from "./src/server/index.js";

const GREEN = "\x1b[32m",
	RED = "\x1b[31m",
	CYAN = "\x1b[36m";
const BOLD = "\x1b[1m",
	DIM = "\x1b[2m",
	RESET = "\x1b[0m";
function ok(msg) {
	console.log(`  ${GREEN}✓${RESET} ${msg}`);
}
function fail(msg) {
	console.log(`  ${RED}✗${RESET} ${msg}`);
}
function step(n, t) {
	console.log(`\n${BOLD}${CYAN}━━━ ${n}: ${t} ━━━${RESET}`);
}
function fmt(r) {
	return (Number(r) / 1e6).toFixed(2);
}

// YOUR wallet
const AGENT_KEY = "0x2804cbba04cea055984b27972abf6eb63f95bd4d0d8f1e395a41dca8966f4907";
const GUARDIAN = "0x303b28924076a9863e6717ed77bd6975ebd79558";
const ALPHAUSD = "0x20c0000000000000000000000000000000000001";
const EXPLORER = "https://explore.moderato.tempo.xyz";

// Vendor address that's in the allowlist
const VENDOR_ADDR = "0x0000000000000000000000000000000000000001";

const GuardianAbi = parseAbi([
	"function pay(address,address,uint256) external",
	"function proposePay(address,address,uint256) external returns (uint256,bool)",
	"function spentToday() view returns (uint256)",
	"function totalSpent() view returns (uint256)",
]);
const Tip20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);

const agentAccount = privateKeyToAccount(AGENT_KEY);
const pub = createPublicClient({
	chain: tempoModerato,
	transport: viemHttp("https://rpc.moderato.tempo.xyz"),
});
const agentW = createWalletClient({
	account: agentAccount,
	chain: tempoModerato,
	transport: viemHttp("https://rpc.moderato.tempo.xyz"),
});

async function send(client, args) {
	const hash = await client.writeContract(args);
	await waitForTransactionReceipt(pub, { hash });
	return hash;
}

console.log(`\n${BOLD}${GREEN}╔═══════════════════════════════════════════════════╗${RESET}`);
console.log(`${BOLD}${GREEN}║  Testing YOUR Marketing Bot Wallet via MPP        ║${RESET}`);
console.log(`${BOLD}${GREEN}╚═══════════════════════════════════════════════════╝${RESET}`);
console.log(`${DIM}  Guardian: ${GUARDIAN}`);
console.log(`  Agent: ${agentAccount.address}${RESET}`);

// ─── Test 1: MPP Payment (happy path) ────────────────────────────
step("Test 1", "Agent pays allowed vendor via local MPP server");

const localServer = await new Promise((resolve) => {
	const server = Mppx_server.create({
		methods: [
			tempo_server.charge({
				getClient: () => pub,
				currency: ALPHAUSD,
				account: VENDOR_ADDR,
			}),
		],
		realm: "test.agentbank.xyz",
		secretKey: "test-secret",
	});
	const httpServer = http.createServer(async (req, res) => {
		const result = await Mppx_server.toNodeListener(
			server.charge({ amount: "1", decimals: 6, recipient: VENDOR_ADDR }),
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
	methods: [tempo_client({ account: agentAccount, getClient: () => pub })],
	async onChallenge(challenge) {
		const { amount, currency, recipient } = challenge.request;
		console.log(
			`${DIM}    402 → pay $${fmt(BigInt(amount))} to ${recipient.slice(0, 10)}...${RESET}`,
		);
		console.log(`${DIM}    Routing through Guardian.pay()...${RESET}`);
		const hash = await send(agentW, {
			address: GUARDIAN,
			abi: GuardianAbi,
			functionName: "pay",
			args: [currency, recipient, BigInt(amount)],
		});
		ok(`Guardian approved → ${EXPLORER}/tx/${hash}`);
		return Credential.serialize(
			Credential.from({
				challenge,
				payload: { hash, type: "hash" },
				source: `did:pkh:eip155:42431:${agentAccount.address}`,
			}),
		);
	},
});

const res = await mppx.fetch(`${localServer.url}/api/paid`);
if (res.status === 200) {
	const body = await res.json();
	ok(`MPP payment successful: "${body.message}"`);
} else {
	fail(`Unexpected status: ${res.status}`);
}
localServer.close();

// ─── Test 2: Blocked vendor ──────────────────────────────────────
step("Test 2", "Agent tries blocked vendor → Guardian reverts");
try {
	await send(agentW, {
		address: GUARDIAN,
		abi: GuardianAbi,
		functionName: "pay",
		args: [ALPHAUSD, "0x000000000000000000000000000000000000dead", 100_000n],
	});
	fail("Should have reverted");
} catch (_e) {
	ok(`${RED}Reverted: "Recipient not allowed"${RESET}`);
}

// ─── Test 3: Over per-tx limit ───────────────────────────────────
step("Test 3", "Agent tries $5 payment (exceeds $2 per-tx cap) → reverts");
try {
	await send(agentW, {
		address: GUARDIAN,
		abi: GuardianAbi,
		functionName: "pay",
		args: [ALPHAUSD, VENDOR_ADDR, 5_000_000n],
	});
	fail("Should have reverted");
} catch (_e) {
	ok(`${RED}Reverted: "Exceeds per-tx limit"${RESET}`);
}

// ─── Test 4: proposePay over limit → creates proposal ────────────
step("Test 4", "Agent proposes $5 via proposePay → creates on-chain proposal");
const proposeHash = await send(agentW, {
	address: GUARDIAN,
	abi: GuardianAbi,
	functionName: "proposePay",
	args: [ALPHAUSD, VENDOR_ADDR, 5_000_000n],
});
ok(`Proposal created → ${EXPLORER}/tx/${proposeHash}`);
ok("Owner can now approve or reject from the dashboard");

// ─── Final state ─────────────────────────────────────────────────
step("Summary", "On-chain state after tests");
const spent = await readContract(pub, {
	address: GUARDIAN,
	abi: GuardianAbi,
	functionName: "spentToday",
});
const total = await readContract(pub, {
	address: GUARDIAN,
	abi: GuardianAbi,
	functionName: "totalSpent",
});
const bal = await readContract(pub, {
	address: ALPHAUSD,
	abi: Tip20,
	functionName: "balanceOf",
	args: [GUARDIAN],
});
ok(`Spent today: $${fmt(spent)} / $10.00 daily`);
ok(`Total spent: $${fmt(total)} / $50.00 lifetime`);
ok(`Guardian balance: $${fmt(bal)} AlphaUSD`);

console.log(`\n${BOLD}${GREEN}All tests passed! Your wallet works with MPP.${RESET}`);
console.log(`${DIM}Explorer: ${EXPLORER}/address/${GUARDIAN}${RESET}\n`);
