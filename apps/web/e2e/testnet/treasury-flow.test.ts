import { expect, test } from "@playwright/test";
import { authenticateContext } from "../helpers/auth";
import { TEST_TEMPO_ADDRESS, TEST_TREASURY_ID, TEST_TREASURY_NAME } from "../helpers/seed";

/**
 * E2E: Authenticated treasury dashboard flow on Tempo Moderato testnet.
 * No RPC mocking — real chain calls. Test wallets have 0 balance but
 * chain calls must succeed without errors.
 */
test.describe("Treasury Dashboard Flow (Testnet)", () => {
	test.beforeEach(async ({ context }) => {
		await authenticateContext(context, {
			treasuryId: TEST_TREASURY_ID,
			tempoAddress: TEST_TEMPO_ADDRESS,
			treasuryName: TEST_TREASURY_NAME,
		});
	});

	test("authenticated user sees dashboard with account cards", async ({ page }) => {
		await page.goto("/dashboard");

		// Wait for account cards (more reliable than treasury name which can be in hidden sidebar)
		await expect(page.getByText("Operations AlphaUSD").first()).toBeVisible({ timeout: 30_000 });
		await expect(page.getByText("Main BetaUSD").first()).toBeVisible({ timeout: 15_000 });
	});

	test("navigate to account detail and verify balance section loads", async ({ page }) => {
		await page.goto("/dashboard");
		await expect(page.getByText("Operations AlphaUSD").first()).toBeVisible({ timeout: 30_000 });

		// Click the first matching card
		await page.getByText("Operations AlphaUSD").first().click();

		// Account detail page should show Balance section
		await expect(page.getByText("Balance").first()).toBeVisible({ timeout: 15_000 });
	});

	test("navigate to transactions page and verify it loads", async ({ page }) => {
		await page.goto("/transactions");

		await expect(page.getByRole("heading", { name: /Transactions/i })).toBeVisible({
			timeout: 30_000,
		});

		await expect(page.getByRole("tab", { name: "All" })).toBeVisible({ timeout: 10_000 });
	});

	test("navigate to agents page and verify seeded data loads", async ({ page }) => {
		await page.goto("/agents");

		await expect(page.getByRole("heading", { name: "Agent Wallets" })).toBeVisible({
			timeout: 30_000,
		});

		await expect(page.getByText("Marketing Bot").first()).toBeVisible({ timeout: 15_000 });
	});

	test("navigate to settings and verify page loads", async ({ page }) => {
		await page.goto("/settings");

		// Use heading role to avoid strict mode (sidebar + page both have "Settings" text)
		await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({
			timeout: 30_000,
		});
	});
});
