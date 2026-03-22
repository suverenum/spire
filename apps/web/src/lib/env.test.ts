import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// env.ts caches its result in a module-level `_env` variable.
// To test different env configurations, we must re-import the module fresh each time.
// vi.resetModules() clears the module cache so the next dynamic import re-evaluates.

const VALID_ENV = {
	NEXT_PUBLIC_TEMPO_CHAIN_ID: "42431",
	NEXT_PUBLIC_TEMPO_RPC_HTTP: "https://rpc.moderato.tempo.xyz",
	NEXT_PUBLIC_TEMPO_RPC_WS: "wss://rpc.moderato.tempo.xyz",
	NEXT_PUBLIC_TEMPO_SPONSOR_URL: "https://sponsor.moderato.tempo.xyz",
	NEXT_PUBLIC_TEMPO_EXPLORER_URL: "https://explore.tempo.xyz",
	NEXT_PUBLIC_TOKENS:
		'[{"name":"AlphaUSD","symbol":"AUSD","decimals":6,"address":"0x20c0000000000000000000000000000000000001"}]',
	NEXT_PUBLIC_DEFAULT_TOKEN: "AlphaUSD",
	NEXT_PUBLIC_FEE_TOKEN: "0x20c0000000000000000000000000000000000000",
	NEXT_PUBLIC_APP_ENV: "development",
};

let savedEnv: NodeJS.ProcessEnv;

beforeEach(() => {
	savedEnv = { ...process.env };
	vi.resetModules();
});

afterEach(() => {
	process.env = savedEnv;
});

describe("env validation", () => {
	it("parses valid environment variables without error", async () => {
		Object.assign(process.env, VALID_ENV);
		const { env } = await import("./env");
		expect(env.NEXT_PUBLIC_TEMPO_CHAIN_ID).toBe(42431);
		expect(env.NEXT_PUBLIC_TEMPO_RPC_HTTP).toBe("https://rpc.moderato.tempo.xyz");
	});

	it("parses NEXT_PUBLIC_FEE_TOKEN from environment", async () => {
		Object.assign(process.env, VALID_ENV);
		const { env } = await import("./env");
		expect(env.NEXT_PUBLIC_FEE_TOKEN).toBe("0x20c0000000000000000000000000000000000000");
	});

	it("allows NEXT_PUBLIC_FEE_TOKEN to be undefined", async () => {
		const { NEXT_PUBLIC_FEE_TOKEN: _, ...envWithoutFee } = VALID_ENV;
		Object.assign(process.env, envWithoutFee);
		delete process.env.NEXT_PUBLIC_FEE_TOKEN;
		const { env } = await import("./env");
		expect(env.NEXT_PUBLIC_FEE_TOKEN).toBeUndefined();
	});

	it("rejects invalid FEE_TOKEN address format with runtime error", async () => {
		Object.assign(process.env, { ...VALID_ENV, NEXT_PUBLIC_FEE_TOKEN: "not-an-address" });
		delete process.env.NEXT_PHASE;
		// Invalid FEE_TOKEN fails Zod regex validation, causing the entire parse to fail.
		// At runtime (no NEXT_PHASE), this triggers the fail-fast throw.
		await expect(async () => {
			const { env } = await import("./env");
			void env.NEXT_PUBLIC_FEE_TOKEN;
		}).rejects.toThrow("NEXT_PUBLIC_FEE_TOKEN");
	});

	it("coerces NEXT_PUBLIC_TEMPO_CHAIN_ID from string to number", async () => {
		Object.assign(process.env, VALID_ENV);
		const { env } = await import("./env");
		expect(typeof env.NEXT_PUBLIC_TEMPO_CHAIN_ID).toBe("number");
		expect(env.NEXT_PUBLIC_TEMPO_CHAIN_ID).toBe(42431);
	});

	it("parses NEXT_PUBLIC_TOKENS JSON array with token objects", async () => {
		Object.assign(process.env, VALID_ENV);
		const { env } = await import("./env");
		expect(env.NEXT_PUBLIC_TOKENS).toHaveLength(1);
		expect(env.NEXT_PUBLIC_TOKENS[0].name).toBe("AlphaUSD");
		expect(env.NEXT_PUBLIC_TOKENS[0].address).toBe("0x20c0000000000000000000000000000000000001");
	});

	it("strips extra quotes from NEXT_PUBLIC_TOKENS (Vercel wrapping)", async () => {
		// Vercel wraps JSON in outer quotes: "[{...}]" becomes '"[{...}]"'
		const inner =
			'[{"name":"AlphaUSD","symbol":"AUSD","decimals":6,"address":"0x20c0000000000000000000000000000000000001"}]';
		Object.assign(process.env, {
			...VALID_ENV,
			NEXT_PUBLIC_TOKENS: `"${inner}"`,
		});
		const { env } = await import("./env");
		expect(env.NEXT_PUBLIC_TOKENS).toHaveLength(1);
		expect(env.NEXT_PUBLIC_TOKENS[0].name).toBe("AlphaUSD");
	});

	it("treats empty string NEXT_PUBLIC_SPONSOR_URL as undefined", async () => {
		Object.assign(process.env, { ...VALID_ENV, NEXT_PUBLIC_TEMPO_SPONSOR_URL: "" });
		const { env } = await import("./env");
		expect(env.NEXT_PUBLIC_TEMPO_SPONSOR_URL).toBeUndefined();
	});
});

describe("env fail-fast behavior", () => {
	it("throws at runtime when required env vars are missing", async () => {
		// Clear all env vars
		for (const key of Object.keys(VALID_ENV)) {
			delete process.env[key];
		}
		delete process.env.NEXT_PHASE;

		await expect(async () => {
			const { env } = await import("./env");
			// Access a property to trigger the proxy
			void env.NEXT_PUBLIC_TEMPO_CHAIN_ID;
		}).rejects.toThrow("[env] Required environment variables are missing or invalid");
	});

	it("includes specific field errors in the thrown message", async () => {
		for (const key of Object.keys(VALID_ENV)) {
			delete process.env[key];
		}
		delete process.env.NEXT_PHASE;

		try {
			const { env } = await import("./env");
			void env.NEXT_PUBLIC_TEMPO_CHAIN_ID;
			expect.unreachable("Should have thrown");
		} catch (err) {
			expect((err as Error).message).toContain("NEXT_PUBLIC_TEMPO_RPC_HTTP");
		}
	});

	it("uses build-time fallback during next build phase", async () => {
		// Clear all env vars but set NEXT_PHASE
		for (const key of Object.keys(VALID_ENV)) {
			delete process.env[key];
		}
		process.env.NEXT_PHASE = "phase-production-build";

		const { env } = await import("./env");
		// Should NOT throw — uses fallback
		expect(env.NEXT_PUBLIC_TEMPO_CHAIN_ID).toBe(0);
		expect(env.NEXT_PUBLIC_TEMPO_RPC_HTTP).toBe("https://placeholder.invalid");
		expect(env.NEXT_PUBLIC_TOKENS).toEqual([]);
	});

	it("does NOT use fallback when NEXT_PHASE is absent", async () => {
		for (const key of Object.keys(VALID_ENV)) {
			delete process.env[key];
		}
		delete process.env.NEXT_PHASE;

		await expect(async () => {
			const { env } = await import("./env");
			void env.NEXT_PUBLIC_TEMPO_CHAIN_ID;
		}).rejects.toThrow();
	});
});

describe("FEE_TOKEN integration", () => {
	it("FEE_TOKEN is NOT derived from ACCOUNT_TOKENS", async () => {
		Object.assign(process.env, VALID_ENV);
		// ACCOUNT_TOKENS[0] would be AlphaUSD at 0x20c0...0001
		// FEE_TOKEN should be 0x20c0...0000 from NEXT_PUBLIC_FEE_TOKEN
		const { env } = await import("./env");
		expect(env.NEXT_PUBLIC_FEE_TOKEN).toBe("0x20c0000000000000000000000000000000000000");
		expect(env.NEXT_PUBLIC_TOKENS[0].address).toBe("0x20c0000000000000000000000000000000000001");
		// They MUST be different — this is the bug we fixed
		expect(env.NEXT_PUBLIC_FEE_TOKEN).not.toBe(env.NEXT_PUBLIC_TOKENS[0].address);
	});
});
