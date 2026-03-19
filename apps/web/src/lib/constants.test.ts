import { describe, expect, it } from "vitest";
import {
	ACCOUNT_TOKENS,
	CACHE_KEYS,
	DEX_ADDRESS,
	KEYCHAIN_ADDRESS,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE_MS,
	SUPPORTED_TOKENS,
	TEMPO_CHAIN_ID,
	TEMPO_EXPLORER_URL,
	TEMPO_RPC_URL,
	HAS_FAUCET,
} from "./constants";
import { TEMPO_NETWORK, networkConfig } from "./network-config";

describe("network config", () => {
	it("defaults to testnet when NEXT_PUBLIC_TEMPO_NETWORK is not set", () => {
		expect(TEMPO_NETWORK).toBe("testnet");
	});

	it("networkConfig matches the selected network", () => {
		expect(networkConfig.chainId).toBe(TEMPO_CHAIN_ID);
		expect(networkConfig.rpcUrl).toBe(TEMPO_RPC_URL);
		expect(networkConfig.explorerUrl).toBe(TEMPO_EXPLORER_URL);
	});

	it("testnet has faucet, mainnet does not", () => {
		if (TEMPO_NETWORK === "testnet") {
			expect(HAS_FAUCET).toBe(true);
		}
	});
});

describe("constants (derived from network config)", () => {
	it("has valid RPC URL", () => {
		expect(TEMPO_RPC_URL).toMatch(/^https:\/\//);
	});

	it("has numeric chain ID", () => {
		expect(typeof TEMPO_CHAIN_ID).toBe("number");
		expect(TEMPO_CHAIN_ID).toBeGreaterThan(0);
	});

	it("has valid explorer URL", () => {
		expect(TEMPO_EXPLORER_URL).toMatch(/^https:\/\//);
	});

	it("has 15 minute session timeout", () => {
		expect(SESSION_MAX_AGE_MS).toBe(15 * 60 * 1000);
	});

	it("has session cookie name", () => {
		expect(SESSION_COOKIE_NAME).toBe("goldhord-session");
	});

	it("has at least one supported token", () => {
		expect(Object.keys(SUPPORTED_TOKENS).length).toBeGreaterThan(0);
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

describe("ACCOUNT_TOKENS", () => {
	it("has at least one token", () => {
		expect(ACCOUNT_TOKENS.length).toBeGreaterThan(0);
	});

	it("all account tokens exist in SUPPORTED_TOKENS", () => {
		for (const token of ACCOUNT_TOKENS) {
			expect(Object.values(SUPPORTED_TOKENS)).toContainEqual(token);
		}
	});
});

describe("precompile addresses (same on all networks)", () => {
	it("DEX is valid hex address", () => {
		expect(DEX_ADDRESS).toBe("0xDEc0000000000000000000000000000000000000");
	});

	it("Keychain is valid hex address", () => {
		expect(KEYCHAIN_ADDRESS).toBe("0xAAAAAAAA00000000000000000000000000000000");
	});
});

describe("CACHE_KEYS", () => {
	it("generates balances key", () => {
		expect(CACHE_KEYS.balances("0x123")).toEqual(["balances", "0x123"]);
	});

	it("generates transactions key", () => {
		expect(CACHE_KEYS.transactions("0x123")).toEqual(["transactions", "0x123"]);
	});

	it("generates accounts key", () => {
		expect(CACHE_KEYS.accounts("t-1")).toEqual(["accounts", "t-1"]);
	});

	it("generates accountBalance key", () => {
		expect(CACHE_KEYS.accountBalance("0xwallet", "0xtoken")).toEqual([
			"accountBalance",
			"0xwallet",
			"0xtoken",
		]);
	});
});
