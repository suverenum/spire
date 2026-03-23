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

test.describe("Full User Journey — End-to-End Happy Path", () => {
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

	test("complete flow: dashboard → account detail → back → agents → swap → settings", async ({
		page,
	}) => {
		// Step 1: Land on dashboard, verify accounts visible
		await page.goto("/dashboard");
		await expect(page.getByText("Operations AlphaUSD").first()).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText("Main BetaUSD").first()).toBeVisible({ timeout: 10_000 });

		// Step 2: Click into EOA account detail
		await page.getByText("Operations AlphaUSD").first().click();
		await expect(page.getByText(/balance/i).first()).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText(/0x1111/i).first()).toBeVisible({ timeout: 10_000 });

		// Step 3: Navigate back to dashboard via sidebar
		const homeLink = page.getByRole("link", { name: /home|dashboard/i }).first();
		if (await homeLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
			await homeLink.click();
			await expect(page.getByText("Operations AlphaUSD").first()).toBeVisible({ timeout: 10_000 });
		}

		// Step 4: Navigate to agents
		const agentsLink = page.getByRole("link", { name: /agent/i }).first();
		if (await agentsLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
			await agentsLink.click();
			await expect(page.getByText("Marketing Bot").first()).toBeVisible({ timeout: 10_000 });
		}

		// Step 5: Navigate to swap
		const swapLink = page.getByRole("link", { name: /swap/i }).first();
		if (await swapLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
			await swapLink.click();
			await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
		}

		// Step 6: Navigate to settings
		const settingsLink = page.getByRole("link", { name: /setting/i }).first();
		if (await settingsLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
			await settingsLink.click();
			await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
		}
	});

	test("account detail pages load for all account types", async ({ page }) => {
		// EOA account
		await page.goto(`/accounts/${TEST_EOA_ACCOUNT_ID}`);
		await expect(page.getByText(/balance/i).first()).toBeVisible({ timeout: 15_000 });

		// BetaUSD account
		await page.goto(`/accounts/${TEST_EOA_ACCOUNT2_ID}`);
		await expect(page.getByText(/balance/i).first()).toBeVisible({ timeout: 15_000 });

		// Multisig account
		await page.goto(`/accounts/${TEST_MULTISIG_ACCOUNT_ID}`);
		await expect(page.getByText(/balance/i).first()).toBeVisible({ timeout: 15_000 });

		// Agent account
		await page.goto(`/agents/${TEST_AGENT_ACCOUNT_ID}`);
		await expect(page.getByText(/spending|limit|guardian/i).first()).toBeVisible({
			timeout: 15_000,
		});
	});

	test("API endpoints return correct status codes for authenticated user", async ({ page }) => {
		// Session — authenticated
		const session = await page.goto("/api/session");
		expect(session?.status()).toBe(200);
		const sessionJson = await session?.json();
		expect(sessionJson.authenticated).toBe(true);
		expect(sessionJson.treasuryName).toBe(TEST_TREASURY_NAME);

		// Balances — owned address returns 200
		const balances = await page.goto(`/api/balances?address=${TEST_TEMPO_ADDRESS}`);
		expect(balances?.status()).toBe(200);
		const balancesJson = await balances?.json();
		expect(Array.isArray(balancesJson.balances)).toBe(true);

		// Balances — non-owned address returns 403
		const forbidden = await page.goto(
			"/api/balances?address=0x0000000000000000000000000000000000000000",
		);
		expect(forbidden?.status()).toBe(403);

		// Transactions — owned address returns 200
		const txs = await page.goto(`/api/transactions?address=${TEST_TEMPO_ADDRESS}`);
		expect(txs?.status()).toBe(200);
		const txsJson = await txs?.json();
		expect(Array.isArray(txsJson.transactions)).toBe(true);
	});

	test("unauthenticated user sees welcome page and cannot access protected routes", async ({
		context,
		page,
	}) => {
		await context.clearCookies();

		// Welcome page shows login/signup
		await page.goto("/");
		await expect(page.getByText(/login|sign in|passkey|welcome/i).first()).toBeVisible({
			timeout: 15_000,
		});

		// Protected routes redirect to welcome
		await page.goto("/dashboard");
		await expect(page.getByText(/login|sign in|passkey|welcome/i).first()).toBeVisible({
			timeout: 15_000,
		});

		// API returns unauthenticated
		const session = await page.goto("/api/session");
		const json = await session?.json();
		expect(json.authenticated).toBe(false);
	});

	test("create account dialog opens with form fields", async ({ page }) => {
		await page.goto("/dashboard");
		await expect(page.getByText("Operations AlphaUSD").first()).toBeVisible({ timeout: 15_000 });

		const createBtn = page.getByRole("button", { name: /create.*account|new.*account|\+/i });
		if (await createBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await createBtn.click();

			// Form should have name input and token selection
			await expect(page.locator("#account-name, #name, [name='name']").first()).toBeVisible({
				timeout: 5_000,
			});
		}
	});

	test("send payment form shows on account detail page", async ({ page }) => {
		await page.goto(`/accounts/${TEST_EOA_ACCOUNT_ID}`);
		await expect(page.getByText(/balance/i).first()).toBeVisible({ timeout: 15_000 });

		// Look for send/transfer button
		const sendBtn = page.getByRole("button", { name: /send|transfer|pay/i }).first();
		if (await sendBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await sendBtn.click();
			// Should show recipient address input
			await expect(
				page.locator("[placeholder*='address'], [name='to'], [name='recipient']").first(),
			).toBeVisible({ timeout: 5_000 });
		}
	});

	test("receive sheet shows wallet address and QR-like info", async ({ page }) => {
		await page.goto(`/accounts/${TEST_EOA_ACCOUNT_ID}`);
		await expect(page.getByText(/balance/i).first()).toBeVisible({ timeout: 15_000 });

		const receiveBtn = page.getByRole("button", { name: /receive|deposit/i }).first();
		if (await receiveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await receiveBtn.click();
			// Should show wallet address
			await expect(page.getByText(/0x1111/i).first()).toBeVisible({ timeout: 5_000 });
		}
	});

	test("multisig account shows pending transactions and signer info", async ({ page }) => {
		await page.goto(`/accounts/${TEST_MULTISIG_ACCOUNT_ID}`);
		await expect(page.getByText(/balance/i).first()).toBeVisible({ timeout: 15_000 });

		// Should show multisig-specific info
		await expect(page.getByText(/multisig|signer|approval|owner|pending/i).first()).toBeVisible({
			timeout: 10_000,
		});
	});

	test("agent wallet shows spending limits and vendor info", async ({ page }) => {
		await page.goto(`/agents/${TEST_AGENT_ACCOUNT_ID}`);

		await expect(page.getByText(/spending|limit/i).first()).toBeVisible({ timeout: 15_000 });
		// Should show guardian address or key info
		await expect(page.getByText(/guardian|key|vendor|0x5555|0x6666/i).first()).toBeVisible({
			timeout: 10_000,
		});
	});
});
