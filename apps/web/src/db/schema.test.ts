import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
	accounts,
	agentWallets,
	multisigConfigs,
	multisigConfirmations,
	multisigTransactions,
	treasuries,
} from "./schema";

describe("treasuries schema", () => {
	it("has the expected table name", () => {
		expect(getTableName(treasuries)).toBe("treasuries");
	});

	it("has the expected columns", () => {
		const columnNames = Object.keys(treasuries);
		expect(columnNames).toContain("id");
		expect(columnNames).toContain("name");
		expect(columnNames).toContain("tempoAddress");
		expect(columnNames).toContain("createdAt");
	});
});

describe("accounts schema", () => {
	it("has the expected table name", () => {
		expect(getTableName(accounts)).toBe("accounts");
	});

	it("has all required columns including walletType", () => {
		const columnNames = Object.keys(accounts);
		expect(columnNames).toContain("id");
		expect(columnNames).toContain("treasuryId");
		expect(columnNames).toContain("name");
		expect(columnNames).toContain("tokenSymbol");
		expect(columnNames).toContain("tokenAddress");
		expect(columnNames).toContain("walletAddress");
		expect(columnNames).toContain("walletType");
		expect(columnNames).toContain("isDefault");
		expect(columnNames).toContain("createdAt");
	});

	it("has exactly the expected columns", () => {
		const expectedColumns = [
			"id",
			"treasuryId",
			"name",
			"tokenSymbol",
			"tokenAddress",
			"walletAddress",
			"walletType",
			"isDefault",
			"createdAt",
		];
		const columnNames = Object.keys(accounts);
		for (const col of expectedColumns) {
			expect(columnNames).toContain(col);
		}
	});
});

describe("agentWallets schema", () => {
	it("has the expected table name", () => {
		expect(getTableName(agentWallets)).toBe("agent_wallets");
	});

	it("has all required columns", () => {
		const columnNames = Object.keys(agentWallets);
		const expected = [
			"id",
			"accountId",
			"label",
			"guardianAddress",
			"agentKeyAddress",
			"encryptedKey",
			"spendingCap",
			"dailyLimit",
			"maxPerTx",
			"allowedVendors",
			"status",
			"deployedAt",
			"createdAt",
		];
		for (const col of expected) {
			expect(columnNames).toContain(col);
		}
	});
});

describe("multisigConfigs schema", () => {
	it("has the expected table name", () => {
		expect(getTableName(multisigConfigs)).toBe("multisig_configs");
	});

	it("has all required columns", () => {
		const columnNames = Object.keys(multisigConfigs);
		expect(columnNames).toContain("id");
		expect(columnNames).toContain("accountId");
		expect(columnNames).toContain("guardAddress");
		expect(columnNames).toContain("owners");
		expect(columnNames).toContain("tiersJson");
		expect(columnNames).toContain("defaultConfirmations");
		expect(columnNames).toContain("allowlistEnabled");
		expect(columnNames).toContain("createdAt");
		expect(columnNames).toContain("updatedAt");
	});
});

describe("multisigTransactions schema", () => {
	it("has the expected table name", () => {
		expect(getTableName(multisigTransactions)).toBe("multisig_transactions");
	});

	it("has all required columns", () => {
		const columnNames = Object.keys(multisigTransactions);
		expect(columnNames).toContain("id");
		expect(columnNames).toContain("accountId");
		expect(columnNames).toContain("onChainTxId");
		expect(columnNames).toContain("to");
		expect(columnNames).toContain("value");
		expect(columnNames).toContain("data");
		expect(columnNames).toContain("requiredConfirmations");
		expect(columnNames).toContain("currentConfirmations");
		expect(columnNames).toContain("executed");
		expect(columnNames).toContain("executedAt");
		expect(columnNames).toContain("createdAt");
	});
});

describe("multisigConfirmations schema", () => {
	it("has the expected table name", () => {
		expect(getTableName(multisigConfirmations)).toBe("multisig_confirmations");
	});

	it("has all required columns", () => {
		const columnNames = Object.keys(multisigConfirmations);
		expect(columnNames).toContain("id");
		expect(columnNames).toContain("multisigTransactionId");
		expect(columnNames).toContain("signerAddress");
		expect(columnNames).toContain("confirmedAt");
	});
});
