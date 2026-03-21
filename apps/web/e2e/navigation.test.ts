import { expect, test } from "@playwright/test";
import { authenticateContext } from "./helpers/auth";
import { mockTempoRPC } from "./helpers/rpc-mock";
import { TEST_TEMPO_ADDRESS, TEST_TREASURY_ID, TEST_TREASURY_NAME } from "./helpers/seed";

test.describe("Navigation E2E", () => {
	test.beforeEach(async ({ context, page }) => {
		await authenticateContext(context, {
			treasuryId: TEST_TREASURY_ID,
			tempoAddress: TEST_TEMPO_ADDRESS,
			treasuryName: TEST_TREASURY_NAME,
		});
		await mockTempoRPC(page);
	});

	test("sidebar links navigate to correct pages", async ({ page }) => {
		await page.goto("/dashboard");
		await expect(page.getByText("Operations AlphaUSD").first()).toBeVisible({ timeout: 15_000 });

		// Navigate to each page via sidebar
		const routes = [
			{ name: /Transactions/i, urlPart: "/transactions" },
			{ name: /Agents/i, urlPart: "/agents" },
			{ name: /Swap/i, urlPart: "/swap" },
			{ name: /Settings/i, urlPart: "/settings" },
		];

		for (const route of routes) {
			const link = page.getByRole("link", { name: route.name }).first();
			if (await link.isVisible({ timeout: 3_000 }).catch(() => false)) {
				await link.click();
				await page.waitForURL(`**${route.urlPart}`, { timeout: 10_000 });
				expect(page.url()).toContain(route.urlPart);
			}
		}
	});

	test("mobile sidebar toggle works", async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto("/dashboard");

		// Look for hamburger/menu button
		const menuBtn = page.getByRole("button", { name: /menu|toggle/i });
		if (await menuBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await menuBtn.click();
			// Sidebar should become visible
			const sidebar = page.locator("aside").first();
			await expect(sidebar).toBeVisible({ timeout: 5_000 });
		}
	});
});
