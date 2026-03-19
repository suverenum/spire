import { networkConfig } from "./network-config";

// ─── Network-derived constants ──────────────────────────────────────
// These are all derived from networkConfig (selected by NEXT_PUBLIC_TEMPO_NETWORK)

export const TEMPO_RPC_URL = networkConfig.rpcUrl;
export const TEMPO_WS_URL = networkConfig.wsUrl;
export const TEMPO_CHAIN_ID = networkConfig.chainId;
export const TEMPO_EXPLORER_URL = networkConfig.explorerUrl;
export const TEMPO_SPONSOR_URL = networkConfig.sponsorUrl;
export const GUARDIAN_FACTORY_ADDRESS = networkConfig.contracts.guardianFactory;
export const MULTISIG_FACTORY_ADDRESS = networkConfig.contracts.multisigFactory;
export const POLICY_GUARD_FACTORY_ADDRESS = networkConfig.contracts.policyGuardFactory;
export const HAS_FAUCET = networkConfig.hasFaucet;

export const SUPPORTED_TOKENS = networkConfig.tokens;

export type TokenName = string & keyof typeof SUPPORTED_TOKENS;

// Tokens available for account creation (subset of SUPPORTED_TOKENS)
export const ACCOUNT_TOKENS = networkConfig.accountTokenNames
	.map((name) => networkConfig.tokens[name])
	.filter(Boolean);

// Default accounts provisioned when a new treasury is created
export const DEFAULT_ACCOUNTS = networkConfig.accountTokenNames.map((tokenSymbol) => ({
	name: "Main",
	tokenSymbol,
}));

// ─── Protocol precompiles (same on all networks) ───────────────────

export const DEX_ADDRESS = "0xDEc0000000000000000000000000000000000000" as `0x${string}`;
export const FEE_MANAGER_ADDRESS = "0xfeec000000000000000000000000000000000000" as `0x${string}`;
export const KEYCHAIN_ADDRESS = "0xAAAAAAAA00000000000000000000000000000000" as `0x${string}`;

// ─── Session ────────────────────────────────────────────────────────

export const SESSION_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
export const SESSION_COOKIE_NAME = "goldhord-session";

// ─── TanStack Query cache keys ──────────────────────────────────────

export const CACHE_KEYS = {
	balances: (address: string) => ["balances", address] as const,
	transactions: (address: string) => ["transactions", address] as const,
	accounts: (treasuryId: string) => ["accounts", treasuryId] as const,
	accountBalance: (walletAddress: string, tokenAddress: string) =>
		["accountBalance", walletAddress, tokenAddress] as const,
	multisigConfig: (accountId: string) => ["multisig-config", accountId] as const,
	pendingTransactions: (accountId: string) => ["pending-transactions", accountId] as const,
	agentWallets: (treasuryId: string) => ["agent-wallets", treasuryId] as const,
	agentConfig: (walletId: string) => ["agent-config", walletId] as const,
} as const;
