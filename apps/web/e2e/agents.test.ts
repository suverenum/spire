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

test.describe("Agent Wallets E2E", () => {
	// ─── Agent Wallets Page ─────────────────────────────────────────

	test.describe("Agent Wallets Page", () => {
		test("shows agent wallet cards", async ({ page }) => {
			await page.goto("/agents");
			await expect(page.getByRole("heading", { name: "Agent Wallets" })).toBeVisible({
				timeout: 15000,
			});
			await expect(page.getByText("Marketing Bot").first()).toBeVisible({ timeout: 15000 });
		});

		test("shows Create Agent Wallet button", async ({ page }) => {
			await page.goto("/agents");
			await page.waitForLoadState("networkidle");
			await expect(page.getByTestId("create-agent-btn")).toBeVisible({ timeout: 15000 });
		});

		test("shows both active and revoked wallets", async ({ page }) => {
			await page.goto("/agents");
			await expect(page.getByText("Marketing Bot").first()).toBeVisible({ timeout: 15000 });
			await expect(page.getByText("Deprecated Bot").first()).toBeVisible({ timeout: 15000 });
		});

		test("shows status badges on wallet cards", async ({ page }) => {
			await page.goto("/agents");
			const badges = page.getByTestId("agent-status-badge");
			await expect(badges.first()).toBeVisible({ timeout: 15000 });
			await expect(page.getByText("active").first()).toBeVisible();
			await expect(page.getByText("revoked").first()).toBeVisible();
		});
	});

	// ─── Create Agent Wallet Dialog ─────────────────────────────────

	test.describe("Create Agent Wallet Dialog", () => {
		test("opens create dialog on button click", async ({ page }) => {
			await page.goto("/agents");
			await page.getByTestId("create-agent-btn").click();
			await expect(page.getByTestId("create-agent-form")).toBeVisible({ timeout: 10000 });
		});

		test("dialog has all required form fields", async ({ page }) => {
			await page.goto("/agents");
			await page.getByTestId("create-agent-btn").click();
			await expect(page.getByTestId("create-agent-form")).toBeVisible({ timeout: 10000 });

			// Label input
			await expect(page.locator("#agent-label")).toBeVisible();
			// Token select
			await expect(page.locator("#agent-token")).toBeVisible();
			// Spending limits
			await expect(page.locator("#spending-cap")).toBeVisible();
			await expect(page.locator("#daily-limit")).toBeVisible();
			await expect(page.locator("#per-tx")).toBeVisible();
			// Funding
			await expect(page.locator("#funding")).toBeVisible();
			// Submit button
			await expect(page.getByTestId("create-agent-submit")).toBeVisible();
		});

		test("shows vendor selection buttons", async ({ page }) => {
			await page.goto("/agents");
			await page.getByTestId("create-agent-btn").click();
			const form = page.getByTestId("create-agent-form");
			await expect(form).toBeVisible({ timeout: 10000 });

			// Check vendor buttons exist within the form
			await expect(form.getByText("OpenAI")).toBeVisible();
			await expect(form.getByText("Anthropic")).toBeVisible();
			await expect(form.getByText("Stability AI")).toBeVisible();
			await expect(form.getByText("fal.ai")).toBeVisible();
			await expect(form.getByText("Perplexity")).toBeVisible();
		});

		test("vendor buttons toggle selection", async ({ page }) => {
			await page.goto("/agents");
			await page.getByTestId("create-agent-btn").click();
			await expect(page.getByTestId("create-agent-form")).toBeVisible({ timeout: 10000 });

			const openaiBtn = page.getByRole("button", { name: "OpenAI" });
			// Click to select
			await openaiBtn.click();
			await expect(openaiBtn).toHaveClass(/border-blue-500/);
			// Click to deselect
			await openaiBtn.click();
			await expect(openaiBtn).not.toHaveClass(/border-blue-500/);
		});
	});

	// ─── Agent Wallet Card Details ──────────────────────────────────

	test.describe("Agent Wallet Card", () => {
		test("card shows spending limits", async ({ page }) => {
			await page.goto("/agents");
			const card = page.getByTestId("agent-wallet-card").first();
			await expect(card).toBeVisible({ timeout: 15000 });

			// Check limits are displayed
			await expect(card.getByText("Per-tx cap")).toBeVisible();
			await expect(card.getByText("Daily limit")).toBeVisible();
			await expect(card.getByText("Total cap")).toBeVisible();
		});

		test("card shows vendor tags", async ({ page }) => {
			await page.goto("/agents");
			const card = page.getByTestId("agent-wallet-card").first();
			await expect(card).toBeVisible({ timeout: 15000 });

			// Active wallet has OpenAI and Stability AI
			await expect(card.getByText("OpenAI")).toBeVisible();
			await expect(card.getByText("Stability AI")).toBeVisible();
		});

		test("revoked wallet disables action buttons", async ({ page }) => {
			await page.goto("/agents");
			// Find the card containing "Deprecated Bot" by filtering agent-wallet-card elements
			const cards = page.getByTestId("agent-wallet-card");
			await expect(cards.first()).toBeVisible({ timeout: 15000 });

			const revokedCard = cards.filter({ hasText: "Deprecated Bot" });
			await expect(revokedCard).toBeVisible();

			// Check Reveal Key and Revoke buttons are disabled
			await expect(revokedCard.getByTestId("reveal-key-btn")).toBeDisabled();
			await expect(revokedCard.getByTestId("revoke-btn")).toBeDisabled();
		});
	});

	// ─── Key Reveal ─────────────────────────────────────────────────

	test.describe("Key Reveal", () => {
		test("reveal key button opens dialog", async ({ page }) => {
			await page.goto("/agents");
			const card = page.getByTestId("agent-wallet-card").first();
			await expect(card).toBeVisible({ timeout: 15000 });

			await card.getByTestId("reveal-key-btn").click();
			await expect(page.getByTestId("reveal-key-dialog")).toBeVisible({ timeout: 10000 });
		});

		test("dialog shows key management UI", async ({ page }) => {
			await page.goto("/agents");
			const card = page.getByTestId("agent-wallet-card").first();
			await expect(card).toBeVisible({ timeout: 15000 });

			await card.getByTestId("reveal-key-btn").click();
			const dialog = page.getByTestId("reveal-key-dialog");
			await expect(dialog).toBeVisible({ timeout: 10000 });

			// Should show title
			await expect(dialog.getByText("Agent Private Key")).toBeVisible();
		});
	});

	// ─── Sidebar Navigation ─────────────────────────────────────────

	test.describe("Sidebar", () => {
		test("sidebar shows Agent Wallets nav item", async ({ page }) => {
			await page.goto("/agents");
			// Scope to the visible desktop sidebar (hidden lg:flex)
			const desktopSidebar = page.locator("aside.hidden.lg\\:flex");
			await expect(desktopSidebar.getByRole("link", { name: /Agent Wallets/ })).toBeVisible({
				timeout: 15000,
			});
		});

		test("Agent Wallets link navigates to /agents", async ({ page }) => {
			await page.goto("/dashboard");
			const desktopSidebar = page.locator("aside.hidden.lg\\:flex");
			await expect(desktopSidebar.getByRole("link", { name: /Agent Wallets/ })).toBeVisible({
				timeout: 15000,
			});
			await desktopSidebar.getByRole("link", { name: /Agent Wallets/ }).click();
			await page.waitForURL("**/agents", { timeout: 10000 });
			await expect(page).toHaveURL(/\/agents/);
		});
	});
});
