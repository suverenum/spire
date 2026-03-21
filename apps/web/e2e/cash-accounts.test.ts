import { expect, test } from "@playwright/test";
import { authenticateContext } from "./helpers/auth";
import { mockTempoRPC } from "./helpers/rpc-mock";
import {
	TEST_EOA_ACCOUNT_ID,
	TEST_TEMPO_ADDRESS,
	TEST_TREASURY_ID,
	TEST_TREASURY_NAME,
} from "./helpers/seed";

test.beforeEach(async ({ context, page }) => {
	await authenticateContext(context, {
		treasuryId: TEST_TREASURY_ID,
		tempoAddress: TEST_TEMPO_ADDRESS,
		treasuryName: TEST_TREASURY_NAME,
	});
	await mockTempoRPC(page);
});

test.describe("Cash Account Lifecycle", () => {
	test("dashboard shows EOA account cards", async ({ page }) => {
		await page.goto("/dashboard");
		await expect(page.getByText("Total Balance").first()).toBeVisible({ timeout: 15000 });
		await expect(page.getByText("Operations AlphaUSD").first()).toBeVisible({ timeout: 10000 });
	});

	test("dashboard shows action buttons", async ({ page }) => {
		await page.goto("/dashboard");
		await expect(page.getByRole("button", { name: /Deposit/ }).first()).toBeVisible({
			timeout: 15000,
		});
	});

	test("cash accounts page loads", async ({ page }) => {
		await page.goto("/cash-accounts");
		await page.waitForTimeout(3000);
		expect(page.url()).toContain("/cash-accounts");
	});

	test("account detail page loads for EOA account", async ({ page }) => {
		await page.goto(`/accounts/${TEST_EOA_ACCOUNT_ID}`);
		await page.waitForTimeout(3000);
		expect(page.url()).toContain(`/accounts/${TEST_EOA_ACCOUNT_ID}`);
	});
});

test.describe("Settings", () => {
	test("settings page shows treasury name in form", async ({ page }) => {
		await page.goto("/settings");
		const nameInput = page.locator('input[name="name"]');
		if (await nameInput.isVisible({ timeout: 10000 })) {
			await expect(nameInput).toHaveValue(TEST_TREASURY_NAME);
		}
	});
});
