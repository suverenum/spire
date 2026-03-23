import { expect, test } from "@playwright/test";
import { authenticateContext } from "../helpers/auth";
import { mockTempoRPC } from "../helpers/rpc-mock";
import {
	TEST_AGENT_ACCOUNT_ID,
	TEST_EOA_ACCOUNT_ID,
	TEST_MULTISIG_ACCOUNT_ID,
	TEST_ORG_NAME,
	TEST_TEMPO_ADDRESS,
	TEST_TREASURY_ID,
	TEST_TREASURY_NAME,
} from "../helpers/seed";

test.describe("Visual Regression — Page Screenshots", () => {
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

	test("welcome page (unauthenticated)", async ({ context, page }) => {
		await context.clearCookies();
		await page.goto("/");
		await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
		await expect(page).toHaveScreenshot("welcome.png", {
			fullPage: true,
			maxDiffPixelRatio: 0.05,
		});
	});

	test("dashboard", async ({ page }) => {
		await page.goto("/dashboard");
		await page.getByText("Operations AlphaUSD").first().waitFor({ timeout: 15_000 });
		await expect(page).toHaveScreenshot("dashboard.png", {
			fullPage: true,
			maxDiffPixelRatio: 0.05,
		});
	});

	test("cash accounts page", async ({ page }) => {
		await page.goto("/cash-accounts");
		await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
		await expect(page).toHaveScreenshot("cash-accounts.png", {
			fullPage: true,
			maxDiffPixelRatio: 0.05,
		});
	});

	test("EOA account detail", async ({ page }) => {
		await page.goto(`/accounts/${TEST_EOA_ACCOUNT_ID}`);
		await page
			.getByText(/balance/i)
			.first()
			.waitFor({ timeout: 15_000 });
		await expect(page).toHaveScreenshot("account-detail-eoa.png", {
			fullPage: true,
			maxDiffPixelRatio: 0.05,
		});
	});

	test("multisig account detail", async ({ page }) => {
		await page.goto(`/accounts/${TEST_MULTISIG_ACCOUNT_ID}`);
		await page
			.getByText(/balance/i)
			.first()
			.waitFor({ timeout: 15_000 });
		await expect(page).toHaveScreenshot("account-detail-multisig.png", {
			fullPage: true,
			maxDiffPixelRatio: 0.05,
		});
	});

	test("agent wallets page", async ({ page }) => {
		await page.goto("/agents");
		await page.getByText("Marketing Bot").first().waitFor({ timeout: 15_000 });
		await expect(page).toHaveScreenshot("agent-wallets.png", {
			fullPage: true,
			maxDiffPixelRatio: 0.05,
		});
	});

	test("agent wallet detail", async ({ page }) => {
		await page.goto(`/agents/${TEST_AGENT_ACCOUNT_ID}`);
		await page
			.getByText(/spending|limit|guardian/i)
			.first()
			.waitFor({ timeout: 15_000 });
		await expect(page).toHaveScreenshot("agent-detail.png", {
			fullPage: true,
			maxDiffPixelRatio: 0.05,
		});
	});

	test("transactions page", async ({ page }) => {
		await page.goto("/transactions");
		await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
		await expect(page).toHaveScreenshot("transactions.png", {
			fullPage: true,
			maxDiffPixelRatio: 0.05,
		});
	});

	test("swap page", async ({ page }) => {
		await page.goto("/swap");
		await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
		await expect(page).toHaveScreenshot("swap.png", {
			fullPage: true,
			maxDiffPixelRatio: 0.05,
		});
	});

	test("settings page", async ({ page }) => {
		await page.goto("/settings");
		await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
		await expect(page).toHaveScreenshot("settings.png", {
			fullPage: true,
			maxDiffPixelRatio: 0.05,
		});
	});
});
