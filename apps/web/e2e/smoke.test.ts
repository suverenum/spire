import { expect, test } from "@playwright/test";

test("homepage loads and displays Goldhord heading", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByRole("heading", { name: "Goldhord" })).toBeVisible();
});
