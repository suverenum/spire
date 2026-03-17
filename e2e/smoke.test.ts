import { test, expect } from "@playwright/test";

test("homepage loads and displays Spire heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Spire" })).toBeVisible();
});
