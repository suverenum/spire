import http from "node:http";
import { createPublicClient, createWalletClient, parseAbi, http as viemHttp } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readContract, waitForTransactionReceipt } from "viem/actions";
import { tempoModerato } from "viem/chains";
import { Mppx as Mppx_client, tempo as tempo_client } from "./src/client/index.js";
import { Credential } from "./src/index.js";
import { Mppx as Mppx_server, tempo as tempo_server } from "./src/server/index.js";
import { requireAddress, requireHexKey } from "./env";

const AGENT_KEY = requireHexKey("AGENT_KEY");
const GUARDIAN = requireAddress("GUARDIAN_ADDRESS");
const TOKEN = requireAddress("TOKEN_ADDRESS");
const VENDOR = requireAddress("VENDOR_ADDRESS");
const EXPLORER = "https://explore.moderato.tempo.xyz";
const RPC = "https://rpc.moderato.tempo.xyz";

const GuardianAbi = parseAbi([
	"function pay(address,address,uint256) external",
	"function proposePay(address,address,uint256) external returns (uint256,bool)",
	"function spentToday() view returns (uint256)",
	"function totalSpent() view returns (uint256)",
]);
const tip20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);
const fmt = (n: bigint) => (Number(n) / 1e6).toFixed(2);

const agentAccount = privateKeyToAccount(AGENT_KEY);
const pub = createPublicClient({ chain: tempoModerato, transport: viemHttp(RPC) });
const agentW = createWalletClient({
	account: agentAccount,
	chain: tempoModerato,
	transport: viemHttp(RPC),
});

async function send(client: any, args: any) {
	const hash = await client.writeContract(args);
	await waitForTransactionReceipt(pub, { hash });
	return hash;
}

console.log("\n\x1b[1m\x1b[32m=== Charging $25 via MPP + Guardian ===\x1b[0m\n");
console.log(`  Guardian: ${GUARDIAN}`);
console.log(`  Agent: ${agentAccount.address}\n`);

// Create local MPP server
const localServer = await new Promise<{ url: string; close: () => void }>((resolve) => {
	const server = Mppx_server.create({
		methods: [
			tempo_server.charge({
				getClient: () => pub as any,
				currency: TOKEN,
				account: VENDOR,
			}),
		],
		realm: "charge-test.agentbank.xyz",
		secretKey: "charge-secret",
	});
	const httpServer = http.createServer(async (req, res) => {
		const result = await Mppx_server.toNodeListener(
			server.charge({ amount: "2", decimals: 6, recipient: VENDOR }),
		)(req, res);
		if (result.status === 402) return;
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ status: "ok" }));
	});
	httpServer.listen(0, () => {
		const { port } = httpServer.address() as { port: number };
		resolve({ url: `http://localhost:${port}`, close: () => httpServer.close() });
	});
});

const mppx = Mppx_client.create({
	polyfill: false,
	methods: [tempo_client({ account: agentAccount, getClient: () => pub as any })],
	async onChallenge(challenge: any) {
		const { amount, currency, recipient } = challenge.request;
		try {
			const hash = await send(agentW, {
				address: GUARDIAN,
				abi: GuardianAbi,
				functionName: "pay",
				args: [currency, recipient, BigInt(amount)],
			});
			console.log(`  \x1b[32m✓\x1b[0m pay($${fmt(BigInt(amount))}) → ${EXPLORER}/tx/${hash}`);
			return Credential.serialize(
				Credential.from({
					challenge,
					payload: { hash, type: "hash" as const },
					source: `did:pkh:eip155:42431:${agentAccount.address}`,
				}),
			);
		} catch {
			// Over limit — use proposePay
			const hash = await send(agentW, {
				address: GUARDIAN,
				abi: GuardianAbi,
				functionName: "proposePay",
				args: [currency, recipient, BigInt(amount)],
			});
			console.log(
				`  \x1b[33m→\x1b[0m proposePay($${fmt(BigInt(amount))}) — proposal created, needs approval`,
			);
			// Return credential anyway (the proposal tx has a Transfer if it auto-executed)
			return Credential.serialize(
				Credential.from({
					challenge,
					payload: { hash, type: "hash" as const },
					source: `did:pkh:eip155:42431:${agentAccount.address}`,
				}),
			);
		}
	},
});

// Make 13 x $2 MPP requests = $26 (slightly over $25 target)
const TARGET_PAYMENTS = 13; // 13 x $2 = $26 ≥ $25
let succeeded = 0;
let proposals = 0;

for (let i = 1; i <= TARGET_PAYMENTS; i++) {
	console.log(`\n\x1b[36mPayment ${i}/${TARGET_PAYMENTS}:\x1b[0m`);
	try {
		const res = await mppx.fetch(`${localServer.url}/api/paid`);
		if (res.status === 200) {
			succeeded++;
		} else {
			console.log(`  \x1b[31m✗\x1b[0m Server returned ${res.status}`);
			proposals++;
		}
	} catch (e: any) {
		console.log(`  \x1b[31m✗\x1b[0m Failed: ${e?.message?.slice(0, 60) || "unknown"}`);
		proposals++;
	}
}

localServer.close();

// Final state
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
	address: TOKEN,
	abi: tip20,
	functionName: "balanceOf",
	args: [GUARDIAN],
});

console.log(`\n\x1b[1m\x1b[32m=== Results ===\x1b[0m`);
console.log(`  Direct payments: ${succeeded}`);
console.log(`  Proposals (need approval): ${proposals}`);
console.log(`  Spent today: $${fmt(spent)} / $10.00 daily`);
console.log(`  Total spent: $${fmt(total)} / $50.00 lifetime`);
console.log(`  Balance: $${fmt(bal)}`);
console.log(`  Explorer: ${EXPLORER}/address/${GUARDIAN}\n`);
