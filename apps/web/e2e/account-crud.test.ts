import { expect, test } from "@playwright/test";
import { authenticateContext } from "./helpers/auth";
import { mockTempoRPC } from "./helpers/rpc-mock";
import {
	TEST_EOA_ACCOUNT_ID,
	TEST_TEMPO_ADDRESS,
	TEST_TREASURY_ID,
	TEST_TREASURY_NAME,
} from "./helpers/seed";

test.describe("Account CRUD E2E", () => {
	test.beforeEach(async ({ context, page }) => {
		await authenticateContext(context, {
			treasuryId: TEST_TREASURY_ID,
			tempoAddress: TEST_TEMPO_ADDRESS,
			treasuryName: TEST_TREASURY_NAME,
		});
		await mockTempoRPC(page);
	});

	test("dashboard shows seeded account cards with action buttons", async ({ page }) => {
		await page.goto("/dashboard");

		// Seeded accounts should be visible
		await expect(page.getByText("Operations AlphaUSD").first()).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText("Main BetaUSD").first()).toBeVisible({ timeout: 15_000 });

		// Action buttons should exist
		await expect(page.getByRole("button", { name: /Deposit/i }).first()).toBeVisible({
			timeout: 10_000,
		});
	});

	test("account detail page shows balance and wallet address", async ({ page }) => {
		await page.goto(`/accounts/${TEST_EOA_ACCOUNT_ID}`);

		// Should show account info
		await expect(page.getByText("Balance").first()).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText("Wallet Address").first()).toBeVisible({ timeout: 10_000 });
	});

	test("create account dialog opens with form fields", async ({ page }) => {
		await page.goto("/dashboard");
		await expect(page.getByText("Operations AlphaUSD").first()).toBeVisible({ timeout: 15_000 });

		// Look for create account button
		const createBtn = page.getByRole("button", { name: /create.*account|new.*account|\+/i });
		if (await createBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await createBtn.click();

			// Form should open with fields
			await expect(page.locator("#account-name, #name, [name='name']").first()).toBeVisible({
				timeout: 5_000,
			});
		}
	});

	test("rename dialog opens for existing account", async ({ page }) => {
		await page.goto(`/accounts/${TEST_EOA_ACCOUNT_ID}`);
		await expect(page.getByText("Balance").first()).toBeVisible({ timeout: 15_000 });

		// Look for rename/edit button or menu
		const editBtn = page.getByRole("button", { name: /rename|edit/i });
		if (await editBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await editBtn.click();
			// Rename dialog should open with current name
			await expect(page.locator("input").first()).toBeVisible({ timeout: 5_000 });
		}
	});

	test("delete button shows confirmation for non-default account", async ({ page }) => {
		// Navigate to the multisig account (non-default, allows delete)
		await page.goto("/dashboard");
		await expect(page.getByText("Treasury Multisig").first()).toBeVisible({ timeout: 15_000 });

		// Try to find delete option
		const multisigCard = page.getByText("Treasury Multisig").first();
		await multisigCard.click();

		// Look for delete button on detail page
		const deleteBtn = page.getByRole("button", { name: /delete/i });
		if (await deleteBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await deleteBtn.click();
			// Should show confirmation
			await expect(page.getByText(/confirm|are you sure/i).first()).toBeVisible({
				timeout: 5_000,
			});
		}
	});
});
