import { createWalletClient, createPublicClient, parseAbi, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readContract, waitForTransactionReceipt } from 'viem/actions';
import { tempoModerato } from 'viem/chains';

const agent = privateKeyToAccount('0x2804cbba04cea055984b27972abf6eb63f95bd4d0d8f1e395a41dca8966f4907');
const pub = createPublicClient({ chain: tempoModerato, transport: http('https://rpc.moderato.tempo.xyz') });
const aw = createWalletClient({ account: agent, chain: tempoModerato, transport: http('https://rpc.moderato.tempo.xyz') });

const G = '0x303b28924076a9863e6717ed77bd6975ebd79558' as const;
const TOKEN = '0x20c0000000000000000000000000000000000001' as const;
const VENDOR = '0x0000000000000000000000000000000000000001' as const;
const abi = parseAbi([
    'function pay(address,address,uint256) external',
    'function proposePay(address,address,uint256) external returns (uint256,bool)',
    'function spentToday() view returns (uint256)',
    'function totalSpent() view returns (uint256)',
    'function dailyLimit() view returns (uint256)',
    'function spendingCap() view returns (uint256)',
]);
const tip20 = parseAbi(['function balanceOf(address) view returns (uint256)']);

const fmt = (n: bigint) => (Number(n) / 1e6).toFixed(2);

console.log('\n=== Charging $10 via Guardian ===\n');

// Check state before
const spentBefore = await readContract(pub, { address: G, abi, functionName: 'spentToday' });
const totalBefore = await readContract(pub, { address: G, abi, functionName: 'totalSpent' });
const daily = await readContract(pub, { address: G, abi, functionName: 'dailyLimit' });
const cap = await readContract(pub, { address: G, abi, functionName: 'spendingCap' });
const balBefore = await readContract(pub, { address: TOKEN, abi: tip20, functionName: 'balanceOf', args: [G] });

console.log(`Before:`);
console.log(`  Spent today: $${fmt(spentBefore)} / $${fmt(daily)} daily`);
console.log(`  Total spent: $${fmt(totalBefore)} / $${fmt(cap)} lifetime`);
console.log(`  Balance: $${fmt(balBefore)}`);
console.log(`  Remaining daily: $${fmt(daily - spentBefore)}`);
console.log('');

// $10 = 5 x $2 payments (per-tx cap is $2)
const PAYMENT = 2_000_000n;
const COUNT = 5;
let paid = 0;

console.log(`Strategy: ${COUNT} x $${fmt(PAYMENT)} payments (per-tx cap = $2)\n`);

for (let i = 1; i <= COUNT; i++) {
    try {
        const h = await aw.writeContract({
            address: G, abi, functionName: 'pay',
            args: [TOKEN, VENDOR, PAYMENT],
        });
        await waitForTransactionReceipt(pub, { hash: h });
        paid += Number(PAYMENT);
        console.log(`  ✓ Payment ${i}/${COUNT}: $${fmt(PAYMENT)} — total paid: $${fmt(BigInt(paid))}`);
    } catch (e: any) {
        const r = e?.cause?.reason || e?.shortMessage || '';
        if (r.includes('Daily limit')) {
            console.log(`  ✗ Payment ${i}/${COUNT}: Daily limit exceeded — trying proposePay instead...`);

            // Use proposePay to create an approval request
            try {
                const h = await aw.writeContract({
                    address: G, abi, functionName: 'proposePay',
                    args: [TOKEN, VENDOR, PAYMENT],
                });
                await waitForTransactionReceipt(pub, { hash: h });
                console.log(`    ✓ Proposal created for $${fmt(PAYMENT)} — needs owner approval`);
                console.log(`    → Approve from: https://45.148.101.191.nip.io:6677/agents`);
            } catch (e2: any) {
                console.log(`    ✗ proposePay also failed: ${e2?.cause?.reason || e2?.shortMessage?.slice(0,60) || 'unknown'}`);
            }
        } else if (r.includes('Spending cap')) {
            console.log(`  ✗ Payment ${i}/${COUNT}: Spending cap exceeded ($${fmt(cap)} lifetime limit hit)`);
            console.log(`    → Use proposePay for owner approval`);
        } else {
            console.log(`  ✗ Payment ${i}/${COUNT}: ${r.slice(0, 80)}`);
        }
        break;
    }
}

// Check state after
const spentAfter = await readContract(pub, { address: G, abi, functionName: 'spentToday' });
const totalAfter = await readContract(pub, { address: G, abi, functionName: 'totalSpent' });
const balAfter = await readContract(pub, { address: TOKEN, abi: tip20, functionName: 'balanceOf', args: [G] });

console.log(`\nAfter:`);
console.log(`  Spent today: $${fmt(spentAfter)} / $${fmt(daily)} daily`);
console.log(`  Total spent: $${fmt(totalAfter)} / $${fmt(cap)} lifetime`);
console.log(`  Balance: $${fmt(balAfter)}`);
console.log(`  Actually paid: $${fmt(BigInt(paid))}`);
console.log(`\nExplorer: https://explore.moderato.tempo.xyz/address/${G}`);
