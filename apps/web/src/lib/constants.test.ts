import { describe, expect, it } from "vitest";
import {
	CACHE_KEYS,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE_MS,
	SUPPORTED_TOKENS,
	TEMPO_CHAIN_ID,
	TEMPO_EXPLORER_URL,
	TEMPO_RPC_URL,
} from "./constants";

describe("constants", () => {
	it("has correct Tempo RPC URL", () => {
		expect(TEMPO_RPC_URL).toBe("https://rpc.moderato.tempo.xyz");
	});

	it("has correct chain ID", () => {
		expect(TEMPO_CHAIN_ID).toBe(42431);
	});

	it("has correct explorer URL", () => {
		expect(TEMPO_EXPLORER_URL).toBe("https://explore.tempo.xyz");
	});

	it("has 15 minute session timeout", () => {
		expect(SESSION_MAX_AGE_MS).toBe(15 * 60 * 1000);
	});

	it("has session cookie name", () => {
		expect(SESSION_COOKIE_NAME).toBe("spire-session");
	});

	it("has all four supported tokens", () => {
		expect(Object.keys(SUPPORTED_TOKENS)).toEqual([
			"AlphaUSD",
			"BetaUSD",
			"pathUSD",
			"ThetaUSD",
		]);
	});

	it("all tokens have 6 decimals", () => {
		for (const token of Object.values(SUPPORTED_TOKENS)) {
			expect(token.decimals).toBe(6);
		}
	});

	it("all tokens have valid addresses", () => {
		for (const token of Object.values(SUPPORTED_TOKENS)) {
			expect(token.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
		}
	});
});

describe("CACHE_KEYS", () => {
	it("generates balances key", () => {
		expect(CACHE_KEYS.balances("0x123")).toEqual(["balances", "0x123"]);
	});

	it("generates transactions key", () => {
		expect(CACHE_KEYS.transactions("0x123")).toEqual(["transactions", "0x123"]);
	});
});
