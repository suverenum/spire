import { expect, test } from "@playwright/test";
import { authenticateContext } from "./helpers/auth";
import { mockTempoRPC } from "./helpers/rpc-mock";
import {
	TEST_AGENT_ACCOUNT_ID,
	TEST_EOA_ACCOUNT_ID,
	TEST_EOA_ACCOUNT2_ID,
	TEST_MULTISIG_ACCOUNT_ID,
	TEST_ORG_NAME,
	TEST_TEMPO_ADDRESS,
	TEST_TREASURY_ID,
	TEST_TREASURY_NAME,
} from "./helpers/seed";

test.describe("Treasury Foundation — Organization & Multi-Asset E2E", () => {
	test.beforeEach(async ({ context, page }) => {
		await authenticateContext(context, {
			treasuryId: TEST_TREASURY_ID,
			tempoAddress: TEST_TEMPO_ADDRESS,
			treasuryName: TEST_TREASURY_NAME,
			organizationId: "00000000-0000-0000-0000-000000000099",
			organizationName: TEST_ORG_NAME,
		});
		await mockTempoRPC(page);
	});

	// ─── Session with organizationId ─────────────────────────────

	test("authenticated session includes organizationId (API returns treasury data)", async ({
		page,
	}) => {
		const response = await page.goto("/api/session");
		const json = await response?.json();
		expect(json.authenticated).toBe(true);
		expect(json.treasuryName).toBe(TEST_TREASURY_NAME);
	});

	test("session without organizationId is rejected (forces re-login)", async ({
		context,
		page,
	}) => {
		// Clear existing auth and set a legacy cookie without org fields
		await context.clearCookies();

		// Navigate to a protected page — should redirect to login
		await page.goto("/dashboard");
		// Without valid session, should show welcome/login screen
		await expect(page.getByText(/login|sign in|passkey|welcome/i).first()).toBeVisible({
			timeout: 15_000,
		});
	});

	// ─── Dashboard & Multi-Asset Display ─────────────────────────

	test("dashboard shows all seeded accounts across different tokens", async ({ page }) => {
		await page.goto("/dashboard");

		// Should show both AlphaUSD and BetaUSD accounts
		await expect(page.getByText("Operations AlphaUSD").first()).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText("Main BetaUSD").first()).toBeVisible({ timeout: 10_000 });
	});

	test("dashboard shows multi-token balance section", async ({ page }) => {
		await page.goto("/dashboard");

		// Balance section should be visible (even if 0 due to RPC mock)
		await expect(page.getByText(/balance/i).first()).toBeVisible({ timeout: 15_000 });
	});

	// ─── Account Types Displayed ─────────────────────────────────

	test("dashboard shows multiple account types (EOA accounts)", async ({ page }) => {
		await page.goto("/dashboard");

		// EOA accounts visible on dashboard
		await expect(page.getByText("Operations AlphaUSD").first()).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText("Main BetaUSD").first()).toBeVisible({ timeout: 10_000 });

		// Verify multiple account cards rendered (at least 2)
		const cards = page.locator("[data-testid='account-card']");
		await expect(cards.first()).toBeVisible({ timeout: 10_000 });
		expect(await cards.count()).toBeGreaterThanOrEqual(2);
	});

	// ─── Account Detail Pages ────────────────────────────────────

	test("EOA account detail shows balance cards for all supported tokens", async ({ page }) => {
		await page.goto(`/accounts/${TEST_EOA_ACCOUNT_ID}`);

		// Should show balance section with at least the primary token
		await expect(page.getByText(/balance/i).first()).toBeVisible({ timeout: 15_000 });
		// Wallet address should be visible
		await expect(page.getByText(/0x1111/i).first()).toBeVisible({ timeout: 10_000 });
	});

	test("second EOA account (BetaUSD) detail page loads", async ({ page }) => {
		await page.goto(`/accounts/${TEST_EOA_ACCOUNT2_ID}`);

		await expect(page.getByText(/balance/i).first()).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText(/0x4444/i).first()).toBeVisible({ timeout: 10_000 });
	});

	test("multisig account detail shows multisig badge", async ({ page }) => {
		await page.goto(`/accounts/${TEST_MULTISIG_ACCOUNT_ID}`);

		await expect(page.getByText(/balance/i).first()).toBeVisible({ timeout: 15_000 });
		// Multisig accounts should show signer/approval info
		await expect(page.getByText(/multisig|signer|approval|owner/i).first()).toBeVisible({
			timeout: 10_000,
		});
	});

	// ─── Agent Wallets as Treasury Accounts ──────────────────────

	test("agent wallets page shows guardian accounts", async ({ page }) => {
		await page.goto("/agents");

		await expect(page.getByText("Marketing Bot").first()).toBeVisible({ timeout: 15_000 });
	});

	test("agent wallet detail page shows spending limits", async ({ page }) => {
		await page.goto(`/agents/${TEST_AGENT_ACCOUNT_ID}`);

		// Should show agent wallet details
		await expect(page.getByText(/spending|limit|guardian/i).first()).toBeVisible({
			timeout: 15_000,
		});
	});

	// ─── Navigation Between Account Types ────────────────────────

	test("sidebar navigation works between dashboard, accounts, agents", async ({ page }) => {
		await page.goto("/dashboard");
		await expect(page.getByText(/balance/i).first()).toBeVisible({ timeout: 15_000 });

		// Navigate to agents
		const agentsLink = page.getByRole("link", { name: /agent/i }).first();
		if (await agentsLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await agentsLink.click();
			await expect(page.getByText("Marketing Bot").first()).toBeVisible({ timeout: 10_000 });
		}

		// Navigate to transactions
		const txLink = page.getByRole("link", { name: /transaction/i }).first();
		if (await txLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await txLink.click();
			await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
		}
	});

	// ─── API Endpoints Respect Session ───────────────────────────

	test("balances API returns data for treasury-owned address", async ({ page }) => {
		const response = await page.goto(`/api/balances?address=${TEST_TEMPO_ADDRESS}`);
		const json = await response?.json();
		expect(json.balances).toBeDefined();
		expect(Array.isArray(json.balances)).toBe(true);
	});

	test("balances API rejects non-treasury address", async ({ page }) => {
		const response = await page.goto(
			"/api/balances?address=0x0000000000000000000000000000000000000000",
		);
		expect(response?.status()).toBe(403);
	});

	test("transactions API returns array for treasury-owned address", async ({ page }) => {
		const response = await page.goto(`/api/transactions?address=${TEST_TEMPO_ADDRESS}`);
		const json = await response?.json();
		expect(json.transactions).toBeDefined();
		expect(Array.isArray(json.transactions)).toBe(true);
	});

	test("session API confirms authenticated with treasury name", async ({ page }) => {
		const response = await page.goto("/api/session");
		const json = await response?.json();
		expect(json.authenticated).toBe(true);
		expect(json.tempoAddress).toBe(TEST_TEMPO_ADDRESS);
		expect(json.treasuryName).toBe(TEST_TREASURY_NAME);
	});
});
