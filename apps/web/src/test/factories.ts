import type { AccountWithBalance, Payment, PaymentTransaction } from "@/lib/tempo/types";

// ─── Account Factory ────────────────────────────────────────────────

export function makeAccount(overrides: Partial<AccountWithBalance> = {}): AccountWithBalance {
	const balance = overrides.balance ?? 1000000n;
	return {
		id: "acc-1",
		treasuryId: "treasury-1",
		name: "Main",
		tokenSymbol: "AlphaUSD",
		tokenAddress: "0x20c0000000000000000000000000000000000001" as `0x${string}`,
		walletAddress: "0x1111111111111111111111111111111111111111" as `0x${string}`,
		walletType: "eoa",
		isDefault: false,
		createdAt: new Date("2025-01-01"),
		balance,
		balanceFormatted: `$${Number(balance) / 1_000_000}`,
		...overrides,
	};
}

// ─── Agent Wallet Factory ───────────────────────────────────────────

export interface AgentWalletRecord {
	id: string;
	accountId: string;
	label: string;
	guardianAddress: string;
	agentKeyAddress: string;
	encryptedKey: string;
	spendingCap: bigint;
	dailyLimit: bigint;
	maxPerTx: bigint;
	allowedVendors: string[];
	status: string;
	deployedAt: Date;
	createdAt: Date;
}

export function makeAgentWallet(overrides: Partial<AgentWalletRecord> = {}): AgentWalletRecord {
	return {
		id: "aw-1",
		accountId: "acc-1",
		label: "Marketing Bot",
		guardianAddress: "0x2222222222222222222222222222222222222222",
		agentKeyAddress: "0x3333333333333333333333333333333333333333",
		encryptedKey: "encrypted-key-data",
		spendingCap: 50000000n,
		dailyLimit: 10000000n,
		maxPerTx: 2000000n,
		allowedVendors: ["0x0000000000000000000000000000000000000001"],
		status: "active",
		deployedAt: new Date("2025-06-01"),
		createdAt: new Date("2025-06-01"),
		...overrides,
	};
}

// ─── Treasury Factory ───────────────────────────────────────────────

export interface TreasuryRecord {
	id: string;
	name: string;
	tempoAddress: string;
	createdAt: Date;
}

export function makeTreasury(overrides: Partial<TreasuryRecord> = {}): TreasuryRecord {
	return {
		id: "treasury-1",
		name: "Test Treasury",
		tempoAddress: "0x1234567890abcdef1234567890abcdef12345678",
		createdAt: new Date("2025-01-01"),
		...overrides,
	};
}

// ─── Transaction Factory ────────────────────────────────────────────

export function makePayment(overrides: Partial<Payment> = {}): Payment {
	return {
		id: "tx-1",
		txHash: "0xabc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1" as `0x${string}`,
		from: "0x1111111111111111111111111111111111111111" as `0x${string}`,
		to: "0x2222222222222222222222222222222222222222" as `0x${string}`,
		amount: 5000000n,
		token: "AlphaUSD",
		status: "confirmed",
		timestamp: new Date("2025-06-15"),
		...overrides,
	};
}

export function makePaymentTransaction(
	overrides: Partial<PaymentTransaction> = {},
): PaymentTransaction {
	return {
		groupId: "group-1",
		kind: "payment",
		status: "confirmed",
		timestamp: new Date("2025-06-15"),
		visibleAccountIds: ["acc-1"],
		txHashes: [
			"0xabc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1" as `0x${string}`,
		],
		accountId: "acc-1",
		accountName: "Main",
		direction: "sent",
		from: "0x1111111111111111111111111111111111111111" as `0x${string}`,
		to: "0x2222222222222222222222222222222222222222" as `0x${string}`,
		amount: 5000000n,
		token: "AlphaUSD",
		...overrides,
	};
}

// ─── Multisig Config Factory ────────────────────────────────────────

export interface MultisigConfigRecord {
	id: string;
	accountId: string;
	guardAddress: string;
	owners: string[];
	tiersJson: Array<{ maxValue: string; requiredConfirmations: number }>;
	defaultConfirmations: number;
	allowlistEnabled: boolean;
	agentPrivateKey: string | null;
	agentAddress: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export function makeMultisigConfig(
	overrides: Partial<MultisigConfigRecord> = {},
): MultisigConfigRecord {
	return {
		id: "mc-1",
		accountId: "acc-1",
		guardAddress: "0x4444444444444444444444444444444444444444",
		owners: [
			"0x1111111111111111111111111111111111111111",
			"0x2222222222222222222222222222222222222222",
		],
		tiersJson: [{ maxValue: "1000000", requiredConfirmations: 2 }],
		defaultConfirmations: 2,
		allowlistEnabled: false,
		agentPrivateKey: null,
		agentAddress: null,
		createdAt: new Date("2025-01-01"),
		updatedAt: new Date("2025-01-01"),
		...overrides,
	};
}
