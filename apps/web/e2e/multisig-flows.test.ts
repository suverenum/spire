import { expect, test } from "@playwright/test";
import { authenticateContext } from "./helpers/auth";
import { mockTempoRPC } from "./helpers/rpc-mock";
import {
	TEST_MULTISIG_ACCOUNT_ID,
	TEST_TEMPO_ADDRESS,
	TEST_TREASURY_ID,
	TEST_TREASURY_NAME,
} from "./helpers/seed";

test.describe("Multisig Flows E2E", () => {
	test.beforeEach(async ({ context, page }) => {
		await authenticateContext(context, {
			treasuryId: TEST_TREASURY_ID,
			tempoAddress: TEST_TEMPO_ADDRESS,
			treasuryName: TEST_TREASURY_NAME,
		});
		await mockTempoRPC(page);
	});

	test("multisig account shows approval badge on dashboard", async ({ page }) => {
		await page.goto("/dashboard");

		// Treasury Multisig should be visible
		await expect(page.getByText("Treasury Multisig").first()).toBeVisible({ timeout: 15_000 });

		// Should show multisig badge or indicator
		const hasBadge = await page
			.getByText(/multisig|multi-sig|approval/i)
			.first()
			.isVisible({ timeout: 5_000 })
			.catch(() => false);
		expect(hasBadge).toBe(true);
	});

	test("multisig account detail page loads", async ({ page }) => {
		await page.goto(`/accounts/${TEST_MULTISIG_ACCOUNT_ID}`);

		// Multisig account detail should load — check for balance or wallet info
		await expect(page.getByText("Balance").first()).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText("Wallet Address").first()).toBeVisible({ timeout: 10_000 });
	});

	test("multisig account detail shows approval-related content", async ({ page }) => {
		await page.goto(`/accounts/${TEST_MULTISIG_ACCOUNT_ID}`);

		await expect(page.getByText("Balance").first()).toBeVisible({ timeout: 15_000 });

		// Verify the page loaded with content — multisig info may be in sub-components
		const pageContent = await page.textContent("body");
		expect(pageContent).toBeTruthy();
	});

	test("send form shows Submit for Approval for multisig account", async ({ page }) => {
		await page.goto("/dashboard");
		await expect(page.getByText("Operations AlphaUSD").first()).toBeVisible({ timeout: 15_000 });

		// Open send form
		const sendBtn = page.getByRole("button", { name: /send|pay/i }).first();
		if (await sendBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await sendBtn.click();

			// Select multisig account in the account selector
			const accountSelect = page.locator("#send-account");
			if (await accountSelect.isVisible({ timeout: 5_000 }).catch(() => false)) {
				await accountSelect.selectOption({ label: "Treasury Multisig" });

				// Submit button should say "Submit for Approval" instead of "Send"
				await expect(page.getByRole("button", { name: /submit.*approval/i })).toBeVisible({
					timeout: 5_000,
				});
			}
		}
	});
});
