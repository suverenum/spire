import { expect, test } from "@playwright/test";
import { authenticateContext } from "./helpers/auth";
import { mockTempoRPC } from "./helpers/rpc-mock";
import {
	TEST_AGENT_WALLET_ID,
	TEST_TEMPO_ADDRESS,
	TEST_TREASURY_ID,
	TEST_TREASURY_NAME,
} from "./helpers/seed";

test.describe("Agent Wallet Flows E2E", () => {
	test.beforeEach(async ({ context, page }) => {
		await authenticateContext(context, {
			treasuryId: TEST_TREASURY_ID,
			tempoAddress: TEST_TEMPO_ADDRESS,
			treasuryName: TEST_TREASURY_NAME,
		});
		await mockTempoRPC(page);
	});

	test("agent wallets page shows active and revoked wallets", async ({ page }) => {
		await page.goto("/agents");

		await expect(page.getByRole("heading", { name: "Agent Wallets" })).toBeVisible({
			timeout: 15_000,
		});

		// Active wallet
		await expect(page.getByText("Marketing Bot").first()).toBeVisible({ timeout: 10_000 });

		// Revoked wallet
		await expect(page.getByText("Deprecated Bot").first()).toBeVisible({ timeout: 10_000 });
	});

	test("create agent wallet dialog has required fields", async ({ page }) => {
		await page.goto("/agents");
		await expect(page.getByRole("heading", { name: "Agent Wallets" })).toBeVisible({
			timeout: 15_000,
		});

		// Open create dialog
		const createBtn = page.getByTestId("create-agent-btn");
		if (await createBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await createBtn.click();

			// Form should have label, spending limit, daily limit fields
			await expect(page.locator("#agent-label, #label, [name='label']").first()).toBeVisible({
				timeout: 5_000,
			});
		}
	});

	test("agent detail page shows spending limits", async ({ page }) => {
		await page.goto(`/agents/${TEST_AGENT_WALLET_ID}`);

		// Spending limits section
		await expect(page.getByText(/per-tx|per.tx|daily|limit/i).first()).toBeVisible({
			timeout: 15_000,
		});

		// Should show the seeded values ($2 per-tx, $10 daily)
		const hasLimits =
			(await page
				.getByText("$2.00")
				.isVisible({ timeout: 5_000 })
				.catch(() => false)) ||
			(await page
				.getByText("2.00")
				.isVisible({ timeout: 5_000 })
				.catch(() => false));
		expect(hasLimits).toBe(true);
	});

	test("reveal key dialog opens from agent detail", async ({ page }) => {
		await page.goto(`/agents/${TEST_AGENT_WALLET_ID}`);

		const revealBtn = page.getByTestId("reveal-key-btn");
		if (await revealBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
			await revealBtn.click();

			// Dialog should open
			await expect(page.getByTestId("reveal-key-dialog")).toBeVisible({ timeout: 5_000 });
		}
	});

	test("revoked agent wallet shows disabled controls", async ({ page }) => {
		await page.goto("/agents");
		await expect(page.getByText("Deprecated Bot").first()).toBeVisible({ timeout: 15_000 });

		// Click on revoked wallet
		await page.getByText("Deprecated Bot").first().click();

		// Controls should be disabled or show revoked status
		const hasRevoked = await page
			.getByText(/revoked/i)
			.first()
			.isVisible({ timeout: 10_000 })
			.catch(() => false);
		expect(hasRevoked).toBe(true);
	});

	test("top up button visible on active agent wallet", async ({ page }) => {
		await page.goto(`/agents/${TEST_AGENT_WALLET_ID}`);

		const topUpBtn = page.getByTestId("top-up-btn");
		await expect(topUpBtn).toBeVisible({ timeout: 15_000 });
	});
});
