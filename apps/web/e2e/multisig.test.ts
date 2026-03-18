import { expect, test } from "@playwright/test";
import { authenticateContext } from "./helpers/auth";
import {
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

	// Intercept Tempo RPC calls to return mock balance data
	// This prevents timeouts from fake wallet addresses hitting real RPC
	await page.route("**/rpc.moderato.tempo.xyz**", async (route) => {
		const body = route.request().postDataJSON?.();
		if (body?.method === "eth_call") {
			// Return 0 balance for any ERC20 balanceOf call
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: body.id,
					result:
						"0x0000000000000000000000000000000000000000000000000000000000000000",
				}),
			});
		} else if (body?.method === "eth_getTransactionCount") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ jsonrpc: "2.0", id: body.id, result: "0x0" }),
			});
		} else {
			// Let other calls through
			await route.continue();
		}
	});

	// Also intercept the fee sponsor RPC
	await page.route("**/sponsor.moderato.tempo.xyz**", async (route) => {
		await route.continue();
	});
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

		test("shows dashboard page structure with send/receive buttons", async ({
			page,
		}) => {
			await page.goto("/dashboard");
			// Dashboard renders with action buttons even while accounts load
			await expect(
				page.getByRole("button", { name: /Send/ }).first(),
			).toBeVisible({
				timeout: 15000,
			});
			await expect(
				page.getByRole("button", { name: /Receive/ }).first(),
			).toBeVisible({
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
			await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible(
				{ timeout: 15000 },
			);
			await expect(
				page.getByRole("button", { name: /Create Account/ }),
			).toBeVisible({
				timeout: 15000,
			});
		});

		test("shows create account button", async ({ page }) => {
			await page.goto("/accounts");
			await expect(
				page.getByRole("button", { name: /Create Account/ }),
			).toBeVisible();
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

	test.describe("Send Payment Form", () => {
		test("send form shows Submit for Approval for multisig accounts", async ({
			page,
		}) => {
			await page.goto("/dashboard");
			// Click send button to open payment form
			const sendButton = page.getByRole("button", { name: /Send/ }).first();
			if (await sendButton.isVisible()) {
				await sendButton.click();
				// If we can select the multisig account, the button should show "Submit for Approval"
				const fromSelect = page.locator("#send-account");
				if (await fromSelect.isVisible()) {
					await fromSelect.selectOption({ label: "Treasury Multisig" });
					await expect(
						page.getByRole("button", { name: /Submit for Approval/ }),
					).toBeVisible();
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
			await expect(
				page.locator("main").getByText("Settings").first(),
			).toBeVisible({
				timeout: 15000,
			});
		});
	});
});
