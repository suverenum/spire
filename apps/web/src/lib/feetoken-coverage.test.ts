import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

/**
 * Integration test: verifies ALL non-template writeContract calls pass feeToken.
 *
 * This catches the bug where new writeContract calls are added without feeToken,
 * which would cause transactions to fail on chains where the default fee token
 * doesn't match what the user holds.
 *
 * Excluded files:
 * - code-snippet.ts: static template string, not executable
 * - create-guarded-mppx.ts: agent-side utility, separate concern
 * - send-payment-form.tsx: uses Hooks.token.transferSync which handles feeToken internally
 * - *.test.*: test files
 */

const EXCLUDED_PATTERNS = ["code-snippet", "create-guarded-mppx", "send-payment-form", ".test."];

describe("feeToken coverage", () => {
	it("all non-template writeContract calls include feeToken spread", () => {
		const cwd = process.cwd().replace(/\/apps\/web$/, "");
		const grepResult = execSync(`grep -rn "writeContract({" apps/web/src/ || true`, {
			encoding: "utf-8",
			cwd,
		});

		const lines = grepResult
			.split("\n")
			.filter((l) => l.trim())
			.filter((l) => !EXCLUDED_PATTERNS.some((p) => l.includes(p)));

		expect(lines.length).toBeGreaterThan(0);

		const missing: string[] = [];

		for (const line of lines) {
			const [filePath, lineNoStr] = line.split(":");
			const lineNo = Number.parseInt(lineNoStr, 10);

			// Read the next 20 lines to find feeToken within the writeContract call
			const context = execSync(`sed -n '${lineNo},${lineNo + 20}p' ${filePath}`, {
				encoding: "utf-8",
				cwd,
			});

			// Check for feeToken or closing of writeContract block
			const hasClosingBrace = context.includes("});") || context.includes("} as ");
			if (hasClosingBrace && !context.includes("feeToken")) {
				missing.push(`${filePath}:${lineNo}`);
			}
		}

		expect(missing).toEqual([]);
	});

	it("FEE_TOKEN is imported from @/lib/wagmi in files using feeToken", () => {
		const cwd = process.cwd().replace(/\/apps\/web$/, "");
		const filesWithFeeToken = execSync(`grep -rl "feeToken: FEE_TOKEN" apps/web/src/ || true`, {
			encoding: "utf-8",
			cwd,
		})
			.split("\n")
			.filter((l) => l.trim());

		for (const file of filesWithFeeToken) {
			const content = execSync(`cat ${file}`, { encoding: "utf-8", cwd });
			const hasFeeTokenImport =
				content.includes("import { FEE_TOKEN }") ||
				content.includes("FEE_TOKEN }") ||
				content.includes("FEE_TOKEN,");
			expect(hasFeeTokenImport, `${file} uses FEE_TOKEN but doesn't import it`).toBe(true);
		}
	});
});
