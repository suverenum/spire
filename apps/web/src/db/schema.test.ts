import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { accounts, treasuries } from "./schema";

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

	it("has all required columns", () => {
		const columnNames = Object.keys(accounts);
		expect(columnNames).toContain("id");
		expect(columnNames).toContain("treasuryId");
		expect(columnNames).toContain("name");
		expect(columnNames).toContain("tokenSymbol");
		expect(columnNames).toContain("tokenAddress");
		expect(columnNames).toContain("walletAddress");
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
			"isDefault",
			"createdAt",
		];
		const columnNames = Object.keys(accounts);
		for (const col of expectedColumns) {
			expect(columnNames).toContain(col);
		}
	});
});
