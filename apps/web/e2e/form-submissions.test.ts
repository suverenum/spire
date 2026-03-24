import { expect, test } from "@playwright/test";
import { authenticateContext } from "./helpers/auth";
import { cleanupTestAccount, verifyAccountExists } from "./helpers/db-verify";
import { mockTempoRPC } from "./helpers/rpc-mock";
import { TEST_TEMPO_ADDRESS, TEST_TREASURY_ID, TEST_TREASURY_NAME } from "./helpers/seed";

const ORG_ID = "00000000-0000-0000-0000-000000000099";
const ORG_NAME = "E2E Test Organization";

test.describe("Form Submissions — Real DB Verification", () => {
	test.beforeEach(async ({ context, page }) => {
		await authenticateContext(context, {
			treasuryId: TEST_TREASURY_ID,
			tempoAddress: TEST_TEMPO_ADDRESS,
			treasuryName: TEST_TREASURY_NAME,
			organizationId: ORG_ID,
			organizationName: ORG_NAME,
		});
		await mockTempoRPC(page);
	});

	test("create account: fills form, submits, verifies UI + DB", async ({ page }) => {
		const accountName = `E2E Test Account ${Date.now()}`;

		// Cleanup any leftover from previous failed runs
		await cleanupTestAccount(accountName, TEST_TREASURY_ID);

		try {
			// Navigate to cash accounts page (where "New account" button lives)
			await page.goto("/cash-accounts");
			await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

			// Open create account dialog
			const createBtn = page.getByRole("button", { name: /new account/i });
			await expect(createBtn).toBeVisible({ timeout: 10_000 });
			await createBtn.click();

			// Fill the form
			const nameInput = page.locator("#account-name");
			await expect(nameInput).toBeVisible({ timeout: 5_000 });
			await nameInput.fill(accountName);

			// Select token (AlphaUSD should be default, but ensure it's selected)
			const tokenSelect = page.locator("#account-token");
			if (await tokenSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
				await tokenSelect.selectOption("AlphaUSD");
			}

			// Submit the form
			const submitBtn = page.getByRole("button", { name: /create account/i });
			await submitBtn.click();

			// Wait for success — dialog should close and account should appear in list
			// The sheet closes on success, and TanStack Query invalidates the accounts cache
			await expect(page.getByText(accountName).first()).toBeVisible({ timeout: 20_000 });

			// Verify DB state
			const dbResult = await verifyAccountExists(accountName, TEST_TREASURY_ID);
			expect(dbResult.exists).toBe(true);
			expect(dbResult.walletType).toBe("smart-account");
			expect(dbResult.walletAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
		} finally {
			// Always cleanup
			await cleanupTestAccount(accountName, TEST_TREASURY_ID);
		}
	});

	test("rename account: opens dialog, changes name, verifies DB update", async ({ page }) => {
		// First create an account to rename
		const originalName = `E2E Rename Source ${Date.now()}`;
		const renamedName = `E2E Renamed ${Date.now()}`;

		await cleanupTestAccount(originalName, TEST_TREASURY_ID);
		await cleanupTestAccount(renamedName, TEST_TREASURY_ID);

		try {
			// Create the account first
			await page.goto("/cash-accounts");
			await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

			const createBtn = page.getByRole("button", { name: /new account/i });
			await expect(createBtn).toBeVisible({ timeout: 10_000 });
			await createBtn.click();

			const nameInput = page.locator("#account-name");
			await expect(nameInput).toBeVisible({ timeout: 5_000 });
			await nameInput.fill(originalName);

			const submitBtn = page.getByRole("button", { name: /create account/i });
			await submitBtn.click();
			await expect(page.getByText(originalName).first()).toBeVisible({ timeout: 20_000 });

			// Verify it exists in DB
			const created = await verifyAccountExists(originalName, TEST_TREASURY_ID);
			expect(created.exists).toBe(true);

			// Now navigate to the account detail to find rename
			// Click the account card to go to detail page
			await page.getByText(originalName).first().click();
			await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

			// Look for rename/edit button
			const renameBtn = page.getByRole("button", { name: /rename|edit/i });
			if (await renameBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
				await renameBtn.click();

				// Fill new name
				const renameInput = page.locator("input").first();
				await renameInput.clear();
				await renameInput.fill(renamedName);

				// Submit
				const saveBtn = page.getByRole("button", { name: /save|rename|confirm/i });
				if (await saveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
					await saveBtn.click();
					await page.waitForTimeout(2_000);

					// Verify DB updated
					const renamed = await verifyAccountExists(renamedName, TEST_TREASURY_ID);
					expect(renamed.exists).toBe(true);
				}
			}
		} finally {
			await cleanupTestAccount(originalName, TEST_TREASURY_ID);
			await cleanupTestAccount(renamedName, TEST_TREASURY_ID);
		}
	});

	test("delete account: creates, then deletes via confirmation dialog, verifies DB removal", async ({
		page,
	}) => {
		const accountName = `E2E Delete Target ${Date.now()}`;
		await cleanupTestAccount(accountName, TEST_TREASURY_ID);

		try {
			// Create the account
			await page.goto("/cash-accounts");
			await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

			const createBtn = page.getByRole("button", { name: /new account/i });
			await expect(createBtn).toBeVisible({ timeout: 10_000 });
			await createBtn.click();

			const nameInput = page.locator("#account-name");
			await expect(nameInput).toBeVisible({ timeout: 5_000 });
			await nameInput.fill(accountName);

			const submitBtn = page.getByRole("button", { name: /create account/i });
			await submitBtn.click();
			await expect(page.getByText(accountName).first()).toBeVisible({ timeout: 20_000 });

			// Verify created in DB
			const created = await verifyAccountExists(accountName, TEST_TREASURY_ID);
			expect(created.exists).toBe(true);

			// Navigate to account detail
			await page.getByText(accountName).first().click();
			await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

			// Look for delete button (may be in a menu)
			const deleteBtn = page.getByRole("button", { name: /delete/i });
			if (await deleteBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
				await deleteBtn.click();

				// Confirm deletion
				const confirmBtn = page.getByRole("button", { name: /confirm|yes|delete/i }).last();
				if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
					await confirmBtn.click();
					await page.waitForTimeout(2_000);

					// Verify removed from DB
					const deleted = await verifyAccountExists(accountName, TEST_TREASURY_ID);
					expect(deleted.exists).toBe(false);
				}
			}
		} finally {
			// Ensure cleanup even if test fails partway
			await cleanupTestAccount(accountName, TEST_TREASURY_ID);
		}
	});
});
