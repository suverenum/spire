import { expect, test } from "@playwright/test";
import { authenticateContext } from "./helpers/auth";
import { mockTempoRPC } from "./helpers/rpc-mock";
import { TEST_TEMPO_ADDRESS, TEST_TREASURY_ID, TEST_TREASURY_NAME } from "./helpers/seed";

test.describe("Swap E2E", () => {
	test.beforeEach(async ({ context, page }) => {
		await authenticateContext(context, {
			treasuryId: TEST_TREASURY_ID,
			tempoAddress: TEST_TEMPO_ADDRESS,
			treasuryName: TEST_TREASURY_NAME,
		});
		await mockTempoRPC(page);
	});

	test("swap page loads with token pair selection", async ({ page }) => {
		await page.goto("/swap");

		await expect(page.getByRole("heading", { name: /Swap/i })).toBeVisible({ timeout: 15_000 });

		// Token selectors or amount inputs should be visible
		const hasSwapUI =
			(await page
				.getByText(/AlphaUSD|BetaUSD/i)
				.first()
				.isVisible({ timeout: 5_000 })
				.catch(() => false)) ||
			(await page
				.locator("input[type='text'], input[type='number']")
				.first()
				.isVisible({ timeout: 5_000 })
				.catch(() => false));

		expect(hasSwapUI).toBe(true);
	});
});
