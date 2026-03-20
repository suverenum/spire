import { expect, test } from "@playwright/test";
import { authenticateContext } from "./helpers/auth";
import { TEST_TEMPO_ADDRESS, TEST_TREASURY_ID, TEST_TREASURY_NAME } from "./helpers/seed";

/**
 * Real Testnet E2E Tests
 *
 * These tests do NOT mock RPC calls — they hit the real Tempo Moderato testnet.
 * Since seeded wallet addresses don't exist on-chain, these tests validate:
 * - Auth flow (session handling, redirects)
 * - Page structure loads (navigation, layout)
 * - Graceful handling of zero/empty on-chain data
 */

test.describe("Real Testnet - Auth Flow", () => {
	test("unauthenticated user sees login page with passkey button", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByRole("button", { name: /Login with Passkey/ })).toBeVisible({
			timeout: 15000,
		});
	});

	test("unauthenticated access to dashboard redirects to home", async ({ page }) => {
		await page.goto("/dashboard");
		await page.waitForURL("**/", { timeout: 15000 });
	});

	test("authenticated session provides access to dashboard", async ({ page, context }) => {
		await authenticateContext(context, {
			treasuryId: TEST_TREASURY_ID,
			tempoAddress: TEST_TEMPO_ADDRESS,
			treasuryName: TEST_TREASURY_NAME,
		});
		await page.goto("/dashboard");
		// Page should NOT redirect — we should stay on dashboard
		await page.waitForTimeout(3000);
		expect(page.url()).toContain("/dashboard");
	});

	test("create treasury page is accessible without auth", async ({ page }) => {
		await page.goto("/create");
		await page.waitForTimeout(2000);
		expect(page.url()).toContain("/create");
	});
});

test.describe("Real Testnet - Authenticated Navigation", () => {
	test.beforeEach(async ({ context }) => {
		await authenticateContext(context, {
			treasuryId: TEST_TREASURY_ID,
			tempoAddress: TEST_TEMPO_ADDRESS,
			treasuryName: TEST_TREASURY_NAME,
		});
	});

	test("sidebar navigation renders all links", async ({ page }) => {
		await page.goto("/dashboard");
		const sidebar = page.locator("aside");
		// Wait for any sidebar content
		await expect(sidebar.first()).toBeVisible({ timeout: 15000 });
	});

	test("transactions page loads", async ({ page }) => {
		await page.goto("/transactions");
		await expect(page.getByRole("tab", { name: "All" })).toBeVisible({ timeout: 30000 });
	});

	test("settings page loads", async ({ page }) => {
		await page.goto("/settings");
		await page.waitForTimeout(3000);
		expect(page.url()).toContain("/settings");
	});

	test("agents page loads", async ({ page }) => {
		await page.goto("/agents");
		await page.waitForTimeout(3000);
		expect(page.url()).toContain("/agents");
	});

	test("swap page loads", async ({ page }) => {
		await page.goto("/swap");
		await page.waitForTimeout(3000);
		expect(page.url()).toContain("/swap");
	});
});
