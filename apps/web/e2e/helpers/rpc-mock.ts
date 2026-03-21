import type { Page } from "@playwright/test";

/**
 * Mock Tempo RPC calls to prevent real chain interactions in E2E tests.
 *
 * - eth_call returns zero (simulates 0 balance for any ERC20 query)
 * - eth_getTransactionCount returns 0x0
 * - All other RPC methods pass through to the real node
 * - Sponsor endpoint passes through
 *
 * Usage in beforeEach:
 *   await mockTempoRPC(page);
 */
export async function mockTempoRPC(page: Page): Promise<void> {
	await page.route("**/rpc.moderato.tempo.xyz**", async (route) => {
		const body = route.request().postDataJSON?.();
		if (body?.method === "eth_call") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: body.id,
					result: "0x0000000000000000000000000000000000000000000000000000000000000000",
				}),
			});
		} else if (body?.method === "eth_getTransactionCount") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ jsonrpc: "2.0", id: body.id, result: "0x0" }),
			});
		} else {
			await route.continue();
		}
	});

	await page.route("**/sponsor.moderato.tempo.xyz**", async (route) => {
		await route.continue();
	});
}
