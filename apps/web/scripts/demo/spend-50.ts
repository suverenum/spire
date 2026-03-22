import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { waitForTransactionReceipt } from "viem/actions";
import { tempoModerato } from "viem/chains";
import { requireAddress, requireHexKey } from "./env";

const agent = privateKeyToAccount(requireHexKey("AGENT_KEY"));
const pub = createPublicClient({
	chain: tempoModerato,
	transport: http("https://rpc.moderato.tempo.xyz"),
});
const aw = createWalletClient({
	account: agent,
	chain: tempoModerato,
	transport: http("https://rpc.moderato.tempo.xyz"),
});

const G = requireAddress("GUARDIAN_ADDRESS");
const TOKEN = requireAddress("TOKEN_ADDRESS");
const VENDOR = requireAddress("VENDOR_ADDRESS");
const abi = parseAbi([
	"function pay(address,address,uint256) external",
	"function proposePay(address,address,uint256) external returns (uint256,bool)",
	"function spentToday() view returns (uint256)",
	"function totalSpent() view returns (uint256)",
]);
const { readContract } = await import("viem/actions");

const fmt = (n: bigint) => (Number(n) / 1e6).toFixed(2);

console.log("\n=== Trying to spend $50 ===\n");

// 1. Direct pay($50) — per-tx limit
console.log("1. pay($50) — per-tx cap is $2:");
try {
	const h = await aw.writeContract({
		address: G,
		abi,
		functionName: "pay",
		args: [TOKEN, VENDOR, 50_000_000n],
	});
	await waitForTransactionReceipt(pub, { hash: h });
	console.log("   ERROR: Should have reverted!");
} catch {
	console.log("   ✗ Reverted: Exceeds per-tx limit ✓");
}

// 2. proposePay($50) — creates proposal
console.log("\n2. proposePay($50) — goes to approval queue:");
try {
	const h = await aw.writeContract({
		address: G,
		abi,
		functionName: "proposePay",
		args: [TOKEN, VENDOR, 50_000_000n],
	});
	await waitForTransactionReceipt(pub, { hash: h });
	console.log("   ✓ Proposal created! Owner must approve.");
	console.log(`   tx: https://explore.moderato.tempo.xyz/tx/${h}`);
} catch (e: any) {
	console.log("   ✗ Reverted:", e?.cause?.reason || e?.shortMessage?.slice(0, 80) || "unknown");
}

// 3. Exhaust daily limit with $2 payments
console.log("\n3. Paying $2 x 5 to exhaust $10 daily limit:");
let totalPaid = 0;
for (let i = 0; i < 5; i++) {
	try {
		const h = await aw.writeContract({
			address: G,
			abi,
			functionName: "pay",
			args: [TOKEN, VENDOR, 2_000_000n],
		});
		await waitForTransactionReceipt(pub, { hash: h });
		totalPaid += 2;
		console.log(`   ✓ Payment ${i + 1}: $2.00 (total: $${totalPaid})`);
	} catch (e: any) {
		const r = e?.cause?.reason || e?.shortMessage || "";
		if (r.includes("Daily limit")) console.log(`   ✗ Payment ${i + 1}: Daily limit exceeded ✓`);
		else if (r.includes("Spending cap"))
			console.log(`   ✗ Payment ${i + 1}: Spending cap exceeded ✓`);
		else console.log(`   ✗ Payment ${i + 1}: ${r.slice(0, 60)}`);
		break;
	}
}

// Final state
const spent = await readContract(pub, { address: G, abi, functionName: "spentToday" });
const total = await readContract(pub, { address: G, abi, functionName: "totalSpent" });
console.log(`\n=== Final state ===`);
console.log(`Spent today: $${fmt(spent)} / $10.00 daily`);
console.log(`Total spent: $${fmt(total)} / $50.00 lifetime`);
console.log(`Explorer: https://explore.moderato.tempo.xyz/address/${G}`);
