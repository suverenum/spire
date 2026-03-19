import { createWalletClient, createPublicClient, parseAbi, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readContract, waitForTransactionReceipt } from 'viem/actions';
import { tempoModerato } from 'viem/chains';

const AGENT_KEY = '0xe2b52d60ad2a7a53019f5f5a242999d74770c23b2bdf61bf971881c1cf3f8807';
const GUARDIAN = '0x0dcF19D31643c721f7799e3b6142CB0788CA01CF' as const;
const TOKEN = '0x20c0000000000000000000000000000000000001' as const; // AlphaUSD
const ANTHROPIC = '0x0000000000000000000000000000000000000002' as const;
const RPC = 'https://rpc.moderato.tempo.xyz';

const agent = privateKeyToAccount(AGENT_KEY);
const pub = createPublicClient({ chain: tempoModerato, transport: http(RPC) });
const aw = createWalletClient({ account: agent, chain: tempoModerato, transport: http(RPC) });

const abi = parseAbi([
    'function pay(address,address,uint256) external',
    'function proposePay(address,address,uint256) external returns (uint256,bool)',
    'function allowedRecipients(address) view returns (bool)',
    'function allowedTokens(address) view returns (bool)',
    'function owner() view returns (address)',
    'function agent() view returns (address)',
    'function maxPerTx() view returns (uint256)',
    'function dailyLimit() view returns (uint256)',
    'function spendingCap() view returns (uint256)',
    'function spentToday() view returns (uint256)',
    'function totalSpent() view returns (uint256)',
]);
const tip20 = parseAbi(['function balanceOf(address) view returns (uint256)']);
const fmt = (n: bigint) => (Number(n) / 1e6).toFixed(2);

console.log('\n=== Spending $50 on Anthropic via Guardian ===\n');
console.log(`Agent: ${agent.address}`);
console.log(`Guardian: ${GUARDIAN}`);

// Check on-chain state
const [owner, onChainAgent, tokenAllowed, vendorAllowed, balance, maxPerTx, dailyLimit, spendingCap, spentToday, totalSpent] = await Promise.all([
    readContract(pub, { address: GUARDIAN, abi, functionName: 'owner' }),
    readContract(pub, { address: GUARDIAN, abi, functionName: 'agent' }),
    readContract(pub, { address: GUARDIAN, abi, functionName: 'allowedTokens', args: [TOKEN] }),
    readContract(pub, { address: GUARDIAN, abi, functionName: 'allowedRecipients', args: [ANTHROPIC] }),
    readContract(pub, { address: TOKEN, abi: tip20, functionName: 'balanceOf', args: [GUARDIAN] }),
    readContract(pub, { address: GUARDIAN, abi, functionName: 'maxPerTx' }),
    readContract(pub, { address: GUARDIAN, abi, functionName: 'dailyLimit' }),
    readContract(pub, { address: GUARDIAN, abi, functionName: 'spendingCap' }),
    readContract(pub, { address: GUARDIAN, abi, functionName: 'spentToday' }),
    readContract(pub, { address: GUARDIAN, abi, functionName: 'totalSpent' }),
]);

console.log(`\nOwner: ${owner}`);
console.log(`On-chain agent: ${onChainAgent}`);
console.log(`AlphaUSD allowed: ${tokenAllowed ? 'YES' : 'NO'}`);
console.log(`Anthropic allowed: ${vendorAllowed ? 'YES' : 'NO'}`);
console.log(`Balance: $${fmt(balance)}`);
console.log(`Max per tx: $${fmt(maxPerTx)}`);
console.log(`Daily limit: $${fmt(dailyLimit)}`);
console.log(`Spending cap: $${fmt(spendingCap)}`);
console.log(`Spent today: $${fmt(spentToday)}`);
console.log(`Total spent: $${fmt(totalSpent)}`);

if (!tokenAllowed || !vendorAllowed) {
    console.log('\n❌ Allowlists not configured. Cannot proceed.');
    if (!tokenAllowed) console.log('   → AlphaUSD token not in allowlist');
    if (!vendorAllowed) console.log('   → Anthropic vendor not in allowlist');
    console.log('   Fix from the UI: https://45.148.101.191.nip.io:6677/agents');
    process.exit(1);
}

if (balance === 0n) {
    console.log('\n❌ Guardian has no balance. Fund it first.');
    process.exit(1);
}

// Proceed with $50 charge
const PER_TX = maxPerTx > 0n ? maxPerTx : 2_000_000n;
const TARGET = 50_000_000n; // $50
let totalPaid = 0n;
let proposals = 0;
let directPaid = 0n;

console.log(`\nCharging $50 in $${fmt(PER_TX)} payments...\n`);

while (totalPaid < TARGET) {
    const amount = (TARGET - totalPaid) < PER_TX ? (TARGET - totalPaid) : PER_TX;
    try {
        const h = await aw.writeContract({
            address: GUARDIAN, abi, functionName: 'pay',
            args: [TOKEN, ANTHROPIC, amount],
        });
        await waitForTransactionReceipt(pub, { hash: h });
        totalPaid += amount;
        directPaid += amount;
        console.log(`  ✓ pay($${fmt(amount)}) — total: $${fmt(totalPaid)}`);
    } catch {
        try {
            const h = await aw.writeContract({
                address: GUARDIAN, abi, functionName: 'proposePay',
                args: [TOKEN, ANTHROPIC, amount],
            });
            await waitForTransactionReceipt(pub, { hash: h });
            proposals++;
            totalPaid += amount;
            console.log(`  → proposePay($${fmt(amount)}) — proposal #${proposals} (needs approval)`);
        } catch (e2: any) {
            console.log(`  ✗ Failed: ${(e2?.cause?.reason || e2?.shortMessage || '').slice(0, 80)}`);
            break;
        }
    }
}

const spentAfter = await readContract(pub, { address: GUARDIAN, abi, functionName: 'spentToday' });
const totalAfter = await readContract(pub, { address: GUARDIAN, abi, functionName: 'totalSpent' });
const balAfter = await readContract(pub, { address: TOKEN, abi: tip20, functionName: 'balanceOf', args: [GUARDIAN] });

console.log(`\n=== Results ===`);
console.log(`Direct payments: $${fmt(directPaid)}`);
console.log(`Proposals (need approval): ${proposals}`);
console.log(`Spent today: $${fmt(spentAfter)}`);
console.log(`Total spent: $${fmt(totalAfter)}`);
console.log(`Balance: $${fmt(balAfter)}`);
if (proposals > 0) console.log(`\nApprove at: https://45.148.101.191.nip.io:6677/agents`);
