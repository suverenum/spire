import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { tempoModerato } from 'viem/chains';
import { readContract, waitForTransactionReceipt } from 'viem/actions';

const agent = privateKeyToAccount('0x4d36f122c42947023c04e3b0cb1c6bfbed7b2f47064d2ad15382b293f62e72c7');
const wallet = createWalletClient({ account: agent, chain: tempoModerato, transport: http('https://rpc.moderato.tempo.xyz') });
const pub = createPublicClient({ chain: tempoModerato, transport: http('https://rpc.moderato.tempo.xyz') });
const PATHUSD = '0x20c0000000000000000000000000000000000000' as const;
const GUARDIAN = '0xa8b929d2f30bdf78e22cfc794c38d85041ed4dde' as const;
const abi = parseAbi(['function transfer(address to, uint256 amount) external returns (bool)', 'function balanceOf(address) external view returns (uint256)']);

const hash = await wallet.writeContract({ address: PATHUSD, abi, functionName: 'transfer', args: [GUARDIAN, 10_000_000n] });
await waitForTransactionReceipt(pub, { hash });
const balance = await readContract(pub, { address: PATHUSD, abi, functionName: 'balanceOf', args: [GUARDIAN] });
console.log('Guardian pathUSD balance:', Number(balance) / 1e6, 'USD');
console.log('Transfer tx:', hash);
