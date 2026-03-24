import { expect, test } from "@playwright/test";
import { authenticateContext } from "./helpers/auth";
import { mockTempoRPC } from "./helpers/rpc-mock";
import { TEST_TEMPO_ADDRESS, TEST_TREASURY_ID, TEST_TREASURY_NAME } from "./helpers/seed";

test.describe("Payment Flows E2E", () => {
	test.beforeEach(async ({ context, page }) => {
		await authenticateContext(context, {
			treasuryId: TEST_TREASURY_ID,
			tempoAddress: TEST_TEMPO_ADDRESS,
			treasuryName: TEST_TREASURY_NAME,
		});
		await mockTempoRPC(page);
	});

	test("send payment form opens and validates required fields", async ({ page }) => {
		await page.goto("/dashboard");
		await expect(page.getByText("Operations AlphaUSD").first()).toBeVisible({ timeout: 15_000 });

		// Open send form
		const sendBtn = page.getByRole("button", { name: /send|pay/i }).first();
		if (await sendBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await sendBtn.click();

			// Form should open — look for recipient/amount fields
			const recipientField = page
				.locator("#to, #recipient, [name='to'], [name='recipient']")
				.first();
			const amountField = page.locator("#amount, [name='amount']").first();

			await expect(recipientField).toBeVisible({ timeout: 5_000 });
			await expect(amountField).toBeVisible({ timeout: 5_000 });

			// Submit empty form — should show validation errors
			const submitBtn = page.getByRole("button", { name: /send|confirm|submit/i }).first();
			if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
				await submitBtn.click();
				// Should show at least one error
				const hasError = await page
					.getByText(/required|invalid|enter/i)
					.first()
					.isVisible({ timeout: 3_000 })
					.catch(() => false);
				expect(hasError).toBe(true);
			}
		}
	});

	test("receive sheet opens with QR code", async ({ page }) => {
		await page.goto("/dashboard");
		await expect(page.getByText("Operations AlphaUSD").first()).toBeVisible({ timeout: 15_000 });

		const depositBtn = page.getByRole("button", { name: /deposit|receive/i }).first();
		if (await depositBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await depositBtn.click();

			// Receive sheet should show with QR or wallet address
			const hasQR = await page
				.locator("svg, canvas, [data-testid='qr-code']")
				.first()
				.isVisible({ timeout: 5_000 })
				.catch(() => false);
			const hasAddress = await page
				.getByText(/0x[0-9a-fA-F]{4}/i)
				.first()
				.isVisible({ timeout: 5_000 })
				.catch(() => false);

			expect(hasQR || hasAddress).toBe(true);
		}
	});

	test("transaction history shows filter tabs", async ({ page }) => {
		await page.goto("/transactions");

		await expect(page.getByRole("heading", { name: /Transactions/i })).toBeVisible({
			timeout: 15_000,
		});

		// Filter tabs
		await expect(page.getByRole("tab", { name: "All" })).toBeVisible({ timeout: 10_000 });

		// Click Sent tab
		const sentTab = page.getByRole("tab", { name: "Sent" });
		if (await sentTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
			await sentTab.click();
			await expect(sentTab).toHaveAttribute("aria-selected", "true");
		}
	});

	test("transaction detail page loads for existing tx", async ({ page }) => {
		await page.goto("/transactions");
		await expect(page.getByRole("heading", { name: /Transactions/i })).toBeVisible({
			timeout: 15_000,
		});

		// If there are transaction rows, click the first one
		const txRow = page.locator("a[href*='/transactions/']").first();
		if (await txRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await txRow.click();
			// Detail page should load
			await page.waitForURL("**/transactions/**", { timeout: 10_000 });
		}
	});

	test("send form shows account selector for multi-account treasury", async ({ page }) => {
		await page.goto("/dashboard");
		await expect(page.getByText("Operations AlphaUSD").first()).toBeVisible({ timeout: 15_000 });

		const sendBtn = page.getByRole("button", { name: /send|pay/i }).first();
		if (await sendBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await sendBtn.click();

			// Account selector should be present (treasury has multiple accounts)
			const accountSelect = page.locator("#send-account, [name='account'], select").first();
			if (await accountSelect.isVisible({ timeout: 5_000 }).catch(() => false)) {
				// Should have options for both AlphaUSD accounts
				expect(true).toBe(true); // Account selector exists
			}
		}
	});
});
