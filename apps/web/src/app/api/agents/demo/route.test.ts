import { describe, expect, test } from "vitest";
import { POST } from "./route";

describe("POST /api/agents/demo", () => {
	function makeRequest(body: unknown) {
		return new Request("http://localhost/api/agents/demo", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
	}

	test("returns demo response for valid inputs", async () => {
		const resp = await POST(
			makeRequest({
				agentKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
				guardianAddress: "0x1234567890abcdef1234567890abcdef12345678",
				prompt: "Generate a sunset image",
			}),
		);
		expect(resp.status).toBe(200);
		const data = await resp.json();
		expect(data.imageUrl).toBeDefined();
		expect(data.vendor).toBe("Stability AI");
		expect(data.amount).toBe("0.10");
		expect(data.note).toContain("Demo mode");
	});

	test("rejects missing fields", async () => {
		const resp = await POST(makeRequest({ agentKey: "0xabc" }));
		expect(resp.status).toBe(400);
		const data = await resp.json();
		expect(data.error).toContain("Missing required fields");
	});

	test("rejects invalid agent key format", async () => {
		const resp = await POST(
			makeRequest({
				agentKey: "0xshort",
				guardianAddress: "0x1234567890abcdef1234567890abcdef12345678",
				prompt: "test",
			}),
		);
		expect(resp.status).toBe(400);
		const data = await resp.json();
		expect(data.error).toContain("Invalid agent key");
	});

	test("rejects invalid guardian address format", async () => {
		const resp = await POST(
			makeRequest({
				agentKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
				guardianAddress: "0xshort",
				prompt: "test",
			}),
		);
		expect(resp.status).toBe(400);
		const data = await resp.json();
		expect(data.error).toContain("Invalid guardian address");
	});

	test("returns 400 for invalid JSON body", async () => {
		const req = new Request("http://localhost/api/agents/demo", {
			method: "POST",
			body: "not json",
		});
		const resp = await POST(req);
		expect(resp.status).toBe(400);
	});
});
