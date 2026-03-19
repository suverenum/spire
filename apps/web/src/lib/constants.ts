import { env } from "./env";

// ─── Chain ───────────────────────────────────────────────────────────
export const TEMPO_RPC_URL = env.NEXT_PUBLIC_TEMPO_RPC_HTTP;
export const TEMPO_WS_URL = env.NEXT_PUBLIC_TEMPO_RPC_WS;
export const TEMPO_CHAIN_ID = env.NEXT_PUBLIC_TEMPO_CHAIN_ID;
export const TEMPO_EXPLORER_URL = env.NEXT_PUBLIC_TEMPO_EXPLORER_URL;

// ─── Tokens ──────────────────────────────────────────────────────────
const tokenList = env.NEXT_PUBLIC_TOKENS;

export const SUPPORTED_TOKENS = Object.fromEntries(
	tokenList.map((t) => [t.name, { ...t, address: t.address as `0x${string}` }]),
) as Record<string, { name: string; symbol: string; decimals: number; address: `0x${string}` }>;

export type TokenName = string;

// Tokens available for account creation
export const ACCOUNT_TOKENS = tokenList.map((t) => ({
	...t,
	address: t.address as `0x${string}`,
}));

// Default accounts provisioned when a new treasury is created
export const DEFAULT_ACCOUNTS = [
	{ name: "Main", tokenSymbol: env.NEXT_PUBLIC_DEFAULT_TOKEN as TokenName },
] as const;

// ─── Precompile addresses (same on all Tempo networks) ──────────────
export const DEX_ADDRESS = "0xDEc0000000000000000000000000000000000000" as `0x${string}`;
export const FEE_MANAGER_ADDRESS = "0xfeec000000000000000000000000000000000000" as `0x${string}`;
export const KEYCHAIN_ADDRESS = "0xAAAAAAAA00000000000000000000000000000000" as `0x${string}`;

// ─── App constants (not environment-dependent) ──────────────────────
export const SESSION_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
export const SESSION_COOKIE_NAME = "goldhord-session";

export const CACHE_KEYS = {
	balances: (address: string) => ["balances", address] as const,
	transactions: (address: string) => ["transactions", address] as const,
	accounts: (treasuryId: string) => ["accounts", treasuryId] as const,
	accountBalance: (walletAddress: string, tokenAddress: string) =>
		["accountBalance", walletAddress, tokenAddress] as const,
	multisigConfig: (accountId: string) => ["multisig-config", accountId] as const,
	pendingTransactions: (accountId: string) => ["pending-transactions", accountId] as const,
} as const;
