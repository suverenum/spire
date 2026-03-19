import { NextResponse } from "next/server";

/**
 * POST /api/agents/demo
 *
 * Demo endpoint for the landing page widget.
 * Accepts: { agentKey, guardianAddress, prompt }
 * Returns: { imageUrl, txHash, amount, vendor } or { error }
 *
 * In production, this would use createGuardedMppx to call a real MPP vendor
 * (e.g., Stability AI). For the hackathon demo, we return a placeholder
 * response since we don't have a live MPP image generation vendor yet.
 */
export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { agentKey, guardianAddress, prompt } = body as {
			agentKey?: string;
			guardianAddress?: string;
			prompt?: string;
		};

		if (!agentKey || !guardianAddress || !prompt) {
			return NextResponse.json(
				{ error: "Missing required fields: agentKey, guardianAddress, prompt" },
				{ status: 400 },
			);
		}

		if (!agentKey.startsWith("0x") || agentKey.length !== 66) {
			return NextResponse.json(
				{ error: "Invalid agent key format. Must be a 32-byte hex string starting with 0x." },
				{ status: 400 },
			);
		}

		if (!guardianAddress.startsWith("0x") || guardianAddress.length !== 42) {
			return NextResponse.json({ error: "Invalid guardian address format." }, { status: 400 });
		}

		// In a real implementation, this would:
		// 1. Create a guarded mppx client with the provided key
		// 2. Call an MPP vendor endpoint (e.g., Stability AI)
		// 3. Return the generated image + payment receipt
		//
		// For the hackathon demo, we simulate a successful response.
		// The on-chain payment flow is proven by the Guardian integration tests.

		return NextResponse.json({
			imageUrl: `https://placehold.co/512x512/1a1a2e/16a34a?text=${encodeURIComponent(prompt.slice(0, 30))}`,
			txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
			amount: "0.10",
			vendor: "Stability AI",
			prompt,
			note: "Demo mode — image is a placeholder. On-chain payment flow is verified by Guardian integration tests.",
		});
	} catch {
		return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
	}
}
