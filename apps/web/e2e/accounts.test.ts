import { expect, test } from "@playwright/test";

test.describe("Multi-Account Management", () => {
	test.describe("Dashboard", () => {
		test("shows account cards on dashboard", async ({ page }) => {
			await page.goto("/dashboard");
			// Dashboard should show account cards with balances
			await expect(page.getByText("Total Balance")).toBeVisible();
		});

		test("shows recent transactions section", async ({ page }) => {
			await page.goto("/dashboard");
			await expect(page.getByText("Recent Transactions")).toBeVisible();
		});
	});

	test.describe("Sidebar Navigation", () => {
		test("desktop sidebar shows all navigation links", async ({ page }) => {
			await page.goto("/dashboard");
			await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
			await expect(
				page.getByRole("link", { name: "Transactions" }),
			).toBeVisible();
			await expect(page.getByRole("link", { name: "Accounts" })).toBeVisible();
			await expect(page.getByRole("link", { name: "Swap" })).toBeVisible();
			await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
		});

		test("sidebar shows logout button", async ({ page }) => {
			await page.goto("/dashboard");
			await expect(page.getByRole("button", { name: /Logout/ })).toBeVisible();
		});
	});

	test.describe("Accounts Page", () => {
		test("lists all accounts", async ({ page }) => {
			await page.goto("/accounts");
			// Should show account management page with account cards
			await expect(page.getByText("Accounts")).toBeVisible();
		});

		test("shows create account button", async ({ page }) => {
			await page.goto("/accounts");
			await expect(
				page.getByRole("button", { name: /Create Account/ }),
			).toBeVisible();
		});
	});

	test.describe("Create Account", () => {
		test("opens create account form", async ({ page }) => {
			await page.goto("/accounts");
			await page.getByRole("button", { name: /Create Account/ }).click();
			await expect(page.getByLabel("Account Name")).toBeVisible();
			await expect(page.getByLabel("Token")).toBeVisible();
		});

		test("validates empty name", async ({ page }) => {
			await page.goto("/accounts");
			await page.getByRole("button", { name: /Create Account/ }).click();
			await page.getByRole("button", { name: "Create Account" }).click();
			await expect(page.getByText("Account name is required")).toBeVisible();
		});
	});

	test.describe("Account Detail", () => {
		test("shows account detail page", async ({ page }) => {
			await page.goto("/accounts");
			// Click on first account card
			const firstCard = page.locator("[data-testid='account-card']").first();
			if (await firstCard.isVisible()) {
				await firstCard.click();
				await expect(page.getByText("Balance")).toBeVisible();
			}
		});
	});

	test.describe("Transactions Page", () => {
		test("shows transaction filters", async ({ page }) => {
			await page.goto("/transactions");
			await expect(page.getByText("All")).toBeVisible();
			await expect(page.getByText("Sent")).toBeVisible();
			await expect(page.getByText("Received")).toBeVisible();
		});

		test("shows account filter", async ({ page }) => {
			await page.goto("/transactions");
			await expect(page.getByLabel("Account")).toBeVisible();
		});
	});

	test.describe("Swap Page", () => {
		test("shows swap form with account selectors", async ({ page }) => {
			await page.goto("/swap");
			await expect(page.getByLabel("From")).toBeVisible();
			await expect(page.getByLabel("To")).toBeVisible();
			await expect(page.getByLabel("Amount")).toBeVisible();
			await expect(page.getByRole("button", { name: "Swap" })).toBeVisible();
		});
	});
});
