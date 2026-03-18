export interface AccountBalance {
	token: string;
	tokenAddress: `0x${string}`;
	balance: bigint;
	decimals: number;
}

export interface BalancesResult {
	balances: AccountBalance[];
	partial: boolean;
}

export interface Payment {
	id: string;
	txHash: `0x${string}`;
	from: `0x${string}`;
	to: `0x${string}`;
	amount: bigint;
	token: string;
	memo?: string;
	status: "pending" | "confirmed" | "failed";
	timestamp: Date;
}

// Multi-account types

export interface AccountRecord {
	id: string;
	treasuryId: string;
	name: string;
	tokenSymbol: string;
	tokenAddress: string;
	walletAddress: string;
	isDefault: boolean;
	createdAt: Date;
}

export interface AccountWithBalance extends AccountRecord {
	balance: bigint;
	balanceFormatted: string;
}

interface BaseGroupedTransaction {
	groupId: string;
	kind: "payment" | "internalTransfer" | "swap";
	status: "pending" | "confirmed" | "failed";
	timestamp: Date;
	visibleAccountIds: string[];
}

export interface PaymentTransaction extends BaseGroupedTransaction {
	kind: "payment";
	txHashes: [`0x${string}`];
	accountId: string;
	accountName: string;
	direction: "sent" | "received";
	from: `0x${string}`;
	to: `0x${string}`;
	amount: bigint;
	token: string;
	memo?: string;
}

export interface InternalTransferTransaction extends BaseGroupedTransaction {
	kind: "internalTransfer";
	txHashes: [`0x${string}`];
	direction: "internal";
	fromAccountId: string;
	fromAccountName: string;
	toAccountId: string;
	toAccountName: string;
	fromWalletAddress: `0x${string}`;
	toWalletAddress: `0x${string}`;
	amount: bigint;
	token: string;
}

export interface SwapTransaction extends BaseGroupedTransaction {
	kind: "swap";
	txHashes: `0x${string}`[];
	direction: "internal";
	fromAccountId: string;
	fromAccountName: string;
	toAccountId: string;
	toAccountName: string;
	sourceWalletAddress: `0x${string}`;
	destinationWalletAddress: `0x${string}`;
	amountIn: bigint;
	amountOut?: bigint;
	tokenIn: string;
	tokenOut: string;
	recoveryRequired: boolean;
}

export type GroupedTransaction =
	| PaymentTransaction
	| InternalTransferTransaction
	| SwapTransaction;
