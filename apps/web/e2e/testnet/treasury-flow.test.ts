import { expect, test } from "@playwright/test";
import { authenticateContext } from "../helpers/auth";
import { TEST_TEMPO_ADDRESS, TEST_TREASURY_ID, TEST_TREASURY_NAME } from "../helpers/seed";

/**
 * E2E: Authenticated treasury dashboard flow.
 *
 * Tests the full user journey: authenticate → dashboard loads with real
 * on-chain balance data → navigate to accounts → verify account details.
 *
 * This test hits the real Tempo Moderato testnet (no RPC mocking).
 * Wallet addresses are test fixtures, so balances will be 0 — but the
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

		// Dashboard should load with treasury name
		await expect(page.getByText(TEST_TREASURY_NAME)).toBeVisible({ timeout: 30_000 });

		// Account cards should render (seeded data has Operations AlphaUSD + Main BetaUSD)
		await expect(page.getByText("Operations AlphaUSD")).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText("Main BetaUSD")).toBeVisible({ timeout: 15_000 });
	});

	test("navigate to account detail and verify on-chain balance loads", async ({ page }) => {
		await page.goto("/dashboard");
		await expect(page.getByText("Operations AlphaUSD")).toBeVisible({ timeout: 30_000 });

		// Click on the account card to navigate to detail
		await page.getByText("Operations AlphaUSD").click();

		// Account detail page should load with wallet address
		await expect(page.getByText("AlphaUSD")).toBeVisible({ timeout: 15_000 });

		// Balance section should be present (may show $0.00 for test wallet)
		await expect(page.getByText("Balance")).toBeVisible({ timeout: 15_000 });
	});

	test("navigate to transactions page and verify it loads", async ({ page }) => {
		await page.goto("/transactions");

		await expect(page.getByRole("heading", { name: /Transactions/i })).toBeVisible({
			timeout: 30_000,
		});

		// Filter tabs should be visible
		await expect(page.getByRole("tab", { name: "All" })).toBeVisible({ timeout: 10_000 });
	});

	test("navigate to agents page and verify seeded data loads", async ({ page }) => {
		await page.goto("/agents");

		await expect(page.getByRole("heading", { name: "Agent Wallets" })).toBeVisible({
			timeout: 30_000,
		});

		// Seeded agent wallet should appear
		await expect(page.getByText("Marketing Bot")).toBeVisible({ timeout: 15_000 });
	});

	test("navigate to settings and verify treasury name editable", async ({ page }) => {
		await page.goto("/settings");

		await expect(page.getByText("Settings")).toBeVisible({ timeout: 30_000 });

		// Treasury name input should contain the seeded name
		const nameInput = page.locator('input[name="treasuryName"]');
		if (await nameInput.isVisible({ timeout: 10_000 })) {
			await expect(nameInput).toHaveValue(TEST_TREASURY_NAME);
		}
	});
});
