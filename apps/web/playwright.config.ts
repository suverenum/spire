import { defineConfig, devices } from "@playwright/test";

const TEST_DB_URL =
	process.env.TEST_DATABASE_URL || "postgresql://postgres:testpass@localhost:5432/goldhord_test";

const BASE_URL = process.env.BASE_URL || "http://localhost:11000";
const PORT = new URL(BASE_URL).port || "11000";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",
	globalSetup: "./e2e/global-setup.ts",
	use: {
		baseURL: BASE_URL,
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"], headless: true },
		},
	],
	webServer: {
		command: `DATABASE_URL="${TEST_DB_URL}" PORT=${PORT} bun run dev`,
		url: BASE_URL,
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
		env: {
			DATABASE_URL: TEST_DB_URL,
			SESSION_SECRET: "dev-secret-change-in-production",
			NEXT_PUBLIC_TEMPO_CHAIN_ID: "42431",
			NEXT_PUBLIC_TEMPO_RPC_HTTP: "https://rpc.moderato.tempo.xyz",
			NEXT_PUBLIC_TEMPO_RPC_WS: "wss://rpc.moderato.tempo.xyz",
			NEXT_PUBLIC_TEMPO_SPONSOR_URL: "https://sponsor.moderato.tempo.xyz",
			NEXT_PUBLIC_TEMPO_EXPLORER_URL: "https://explore.tempo.xyz",
			NEXT_PUBLIC_TOKENS: JSON.stringify([
				{
					name: "AlphaUSD",
					symbol: "AUSD",
					decimals: 6,
					address: "0x20c0000000000000000000000000000000000001",
				},
				{
					name: "BetaUSD",
					symbol: "BUSD",
					decimals: 6,
					address: "0x20c0000000000000000000000000000000000002",
				},
			]),
			NEXT_PUBLIC_DEFAULT_TOKEN: "AlphaUSD",
			NEXT_PUBLIC_APP_ENV: "development",
		},
	},
});
