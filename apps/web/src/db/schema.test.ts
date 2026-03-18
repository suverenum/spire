import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { treasuries } from "./schema";

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
