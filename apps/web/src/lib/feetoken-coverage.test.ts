import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Integration test: verifies ALL non-template writeContract calls pass feeToken.
 *
 * Excluded files:
 * - code-snippet.ts: static template string, not executable
 * - create-guarded-mppx.ts: agent-side utility, separate concern
 * - send-payment-form.tsx: uses Hooks.token.transferSync which handles feeToken internally
 * - *.test.*: test files
 */

const EXCLUDED = ["code-snippet", "create-guarded-mppx", "send-payment-form", ".test."];

function walkDir(dir: string): string[] {
	const results: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			if (entry === "node_modules") continue;
			results.push(...walkDir(full));
		} else if (/\.(ts|tsx)$/.test(entry)) {
			results.push(full);
		}
	}
	return results;
}

function findWriteContractCalls(srcDir: string) {
	const files = walkDir(srcDir).filter((f) => !EXCLUDED.some((p) => f.includes(p)));
	const calls: Array<{ file: string; line: number; hasFeeToken: boolean }> = [];

	for (const file of files) {
		const content = readFileSync(file, "utf-8");
		const lines = content.split("\n");

		for (let i = 0; i < lines.length; i++) {
			if (lines[i].includes("writeContract({")) {
				// Read next 20 lines to find feeToken within the call block
				const block = lines.slice(i, i + 21).join("\n");
				const hasClosing = block.includes("});") || block.includes("} as ");
				if (hasClosing) {
					calls.push({
						file: file.replace(srcDir + "/", ""),
						line: i + 1,
						hasFeeToken: block.includes("feeToken"),
					});
				}
			}
		}
	}
	return calls;
}

describe("feeToken coverage", () => {
	it("all non-template writeContract calls include feeToken spread", () => {
		// Resolve src dir relative to this test file
		const srcDir = join(__dirname, "..");
		const calls = findWriteContractCalls(srcDir);

		expect(calls.length).toBeGreaterThan(0);

		const missing = calls.filter((c) => !c.hasFeeToken);
		expect(
			missing,
			`Missing feeToken in: ${missing.map((m) => `${m.file}:${m.line}`).join(", ")}`,
		).toEqual([]);
	});

	it("FEE_TOKEN is imported in files that use it", () => {
		const srcDir = join(__dirname, "..");
		const files = walkDir(srcDir).filter((f) => !f.includes(".test."));

		const filesUsingFeeToken = files.filter((f) => {
			const content = readFileSync(f, "utf-8");
			return content.includes("feeToken: FEE_TOKEN");
		});

		for (const file of filesUsingFeeToken) {
			const content = readFileSync(file, "utf-8");
			const hasImport =
				content.includes("import { FEE_TOKEN }") ||
				content.includes("FEE_TOKEN }") ||
				content.includes("FEE_TOKEN,");
			expect(hasImport, `${file} uses FEE_TOKEN but doesn't import it`).toBe(true);
		}
	});
});
