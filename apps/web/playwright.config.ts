import { defineConfig, devices } from "@playwright/test";

const TEST_DB_URL =
	process.env.TEST_DATABASE_URL || "postgresql://postgres:testpass@localhost:5432/goldhord_test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",
	globalSetup: "./e2e/global-setup.ts",
	use: {
		baseURL: "http://localhost:3000",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"], headless: true },
		},
	],
	webServer: {
		command: `DATABASE_URL="${TEST_DB_URL}" bun run dev`,
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
		env: {
			DATABASE_URL: TEST_DB_URL,
			SESSION_SECRET: "dev-secret-change-in-production",
		},
	},
});
