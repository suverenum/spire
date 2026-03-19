export const TEMPO_RPC_URL = "https://rpc.moderato.tempo.xyz";
export const TEMPO_WS_URL = TEMPO_RPC_URL.replace(/^https:\/\//, "wss://");
export const TEMPO_CHAIN_ID = 42431;
export const TEMPO_EXPLORER_URL = "https://explore.tempo.xyz";
export const GUARDIAN_FACTORY_ADDRESS =
	"0xeffb75d8e4e4622c523bd0b4f2b3ca9e3954b131" as `0x${string}`;

export const SUPPORTED_TOKENS = {
	AlphaUSD: {
		name: "AlphaUSD",
		symbol: "AUSD",
		decimals: 6,
		address: "0x20c0000000000000000000000000000000000001" as `0x${string}`,
	},
	BetaUSD: {
		name: "BetaUSD",
		symbol: "BUSD",
		decimals: 6,
		address: "0x20c0000000000000000000000000000000000002" as `0x${string}`,
	},
	pathUSD: {
		name: "pathUSD",
		symbol: "pUSD",
		decimals: 6,
		address: "0x20c0000000000000000000000000000000000000" as `0x${string}`,
	},
	ThetaUSD: {
		name: "ThetaUSD",
		symbol: "TUSD",
		decimals: 6,
		address: "0x20c0000000000000000000000000000000000003" as `0x${string}`,
	},
} as const;

export type TokenName = keyof typeof SUPPORTED_TOKENS;

// Tokens available for account creation (subset of SUPPORTED_TOKENS)
export const ACCOUNT_TOKENS = [SUPPORTED_TOKENS.AlphaUSD] as const;

// Default accounts provisioned when a new treasury is created
export const DEFAULT_ACCOUNTS = [{ name: "Main", tokenSymbol: "AlphaUSD" as TokenName }] as const;

export const DEX_ADDRESS = "0xDEc0000000000000000000000000000000000000" as `0x${string}`;
export const FEE_MANAGER_ADDRESS = "0xfeec000000000000000000000000000000000000" as `0x${string}`;
export const KEYCHAIN_ADDRESS = "0xAAAAAAAA00000000000000000000000000000000" as `0x${string}`;

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
	agentWallets: (treasuryId: string) => ["agent-wallets", treasuryId] as const,
	agentConfig: (walletId: string) => ["agent-config", walletId] as const,
} as const;
