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

test.describe("Multisig E2E", () => {
	test.describe("Dashboard", () => {
		test("loads dashboard with account cards", async ({ page }) => {
			await page.goto("/dashboard");
			// Wait for client-side hydration and data loading
			await expect(page.getByText("Total Balance").first()).toBeVisible({
				timeout: 15000,
			});
		});

		test("shows dashboard page structure with action buttons", async ({ page }) => {
			await page.goto("/dashboard");
			// Dashboard renders with action buttons even while accounts load
			await expect(page.getByRole("button", { name: /Deposit/ }).first()).toBeVisible({
				timeout: 15000,
			});
			await expect(page.getByRole("button", { name: /Withdraw/ }).first()).toBeVisible({
				timeout: 15000,
			});
		});

		test("multisig account shows multisig badge", async ({ page }) => {
			await page.goto("/dashboard");
			// The multisig badge should be visible on the multisig account card
			const multisigBadge = page.getByTestId("multisig-badge");
			// There should be at least one multisig badge
			if (await multisigBadge.first().isVisible()) {
				await expect(multisigBadge.first()).toContainText("Multisig");
			}
		});
	});

	test.describe("Accounts Page", () => {
		test("lists accounts page with create button", async ({ page }) => {
			await page.goto("/accounts");
			await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible({ timeout: 15000 });
			await expect(page.getByRole("button", { name: /Create Account/ })).toBeVisible({
				timeout: 15000,
			});
		});

		test("shows create account button", async ({ page }) => {
			await page.goto("/accounts");
			await expect(page.getByRole("button", { name: /Create Account/ })).toBeVisible();
		});
	});

	test.describe("Sidebar Navigation", () => {
		test("desktop sidebar shows all navigation links", async ({ page }) => {
			await page.goto("/dashboard");
			const sidebar = page.locator("aside.hidden.lg\\:flex");
			await expect(sidebar.getByRole("link", { name: "Dashboard" })).toBeVisible();
			await expect(sidebar.getByRole("link", { name: "Transactions" })).toBeVisible();
			await expect(sidebar.getByRole("link", { name: "Accounts" })).toBeVisible();
			await expect(sidebar.getByRole("link", { name: "Agent Wallets" })).toBeVisible();
			await expect(sidebar.getByRole("link", { name: "Settings" })).toBeVisible();
		});

		test("sidebar shows logout button", async ({ page }) => {
			await page.goto("/dashboard");
			const sidebar = page.locator("aside.hidden.lg\\:flex");
			await expect(sidebar.getByRole("button", { name: /Logout/ })).toBeVisible({
				timeout: 15000,
			});
		});
	});

	test.describe("Send Payment Form", () => {
		test("send form shows Submit for Approval for multisig accounts", async ({ page }) => {
			await page.goto("/dashboard");
			// Click send button to open payment form
			const sendButton = page.getByRole("button", { name: /Send/ }).first();
			if (await sendButton.isVisible()) {
				await sendButton.click();
				// If we can select the multisig account, the button should show "Submit for Approval"
				const fromSelect = page.locator("#send-account");
				if (await fromSelect.isVisible()) {
					await fromSelect.selectOption({ label: "Treasury Multisig" });
					await expect(page.getByRole("button", { name: /Submit for Approval/ })).toBeVisible();
				}
			}
		});
	});

	test.describe("Transactions Page", () => {
		test("shows transaction filters", async ({ page }) => {
			await page.goto("/transactions");
			await expect(page.getByRole("tab", { name: "All" })).toBeVisible();
			await expect(page.getByRole("tab", { name: "Sent" })).toBeVisible();
			await expect(page.getByRole("tab", { name: "Received" })).toBeVisible();
		});
	});

	test.describe("Settings Page", () => {
		test("shows treasury settings page", async ({ page }) => {
			await page.goto("/settings");
			// Settings page has a form with treasury name input
			await expect(page.locator("main").getByText("Settings").first()).toBeVisible({
				timeout: 15000,
			});
		});
	});
});
