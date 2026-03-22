import { expect, test } from "@playwright/test";
import { authenticateContext } from "./helpers/auth";
import { mockTempoRPC } from "./helpers/rpc-mock";
import { TEST_TEMPO_ADDRESS, TEST_TREASURY_ID, TEST_TREASURY_NAME } from "./helpers/seed";

test.beforeEach(async ({ context, page }) => {
	await authenticateContext(context, {
		treasuryId: TEST_TREASURY_ID,
		tempoAddress: TEST_TEMPO_ADDRESS,
		treasuryName: TEST_TREASURY_NAME,
	});
	await mockTempoRPC(page);
});

test.describe("Payment Flows", () => {
	test("dashboard shows deposit and withdraw buttons", async ({ page }) => {
		await page.goto("/dashboard");
		await expect(page.getByRole("button", { name: /Deposit/ }).first()).toBeVisible({
			timeout: 15000,
		});
		await expect(page.getByRole("button", { name: /Withdraw/ }).first()).toBeVisible({
			timeout: 15000,
		});
	});

	test("deposit button opens receive sheet", async ({ page }) => {
		await page.goto("/dashboard");
		const depositBtn = page.getByRole("button", { name: /Deposit/ }).first();
		await expect(depositBtn).toBeVisible({ timeout: 15000 });
		await depositBtn.click();
		// Receive sheet should show
		await expect(page.getByText(/address/i).first()).toBeVisible({ timeout: 10000 });
	});

	test("transactions page shows filter tabs", async ({ page }) => {
		await page.goto("/transactions");
		await expect(page.getByRole("tab", { name: "All" })).toBeVisible({ timeout: 15000 });
		await expect(page.getByRole("tab", { name: "Sent" })).toBeVisible();
		await expect(page.getByRole("tab", { name: "Received" })).toBeVisible();
	});

	test("transaction tabs are interactive", async ({ page }) => {
		await page.goto("/transactions");
		await expect(page.getByRole("tab", { name: "All" })).toBeVisible({ timeout: 15000 });
		await page.getByRole("tab", { name: "Sent" }).click();
		await expect(page.getByRole("tab", { name: "Sent" })).toHaveAttribute("aria-selected", "true");
	});
});

test.describe("Swap Page", () => {
	test("swap page loads with form", async ({ page }) => {
		await page.goto("/swap");
		await expect(page.locator("main")).toBeVisible({ timeout: 15000 });
	});
});
