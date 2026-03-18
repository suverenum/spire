import { createHmac } from "node:crypto";
import type { BrowserContext } from "@playwright/test";

const DEV_SECRET = "dev-secret-change-in-production";
const COOKIE_NAME = "goldhord-session";

interface SessionData {
	treasuryId: string;
	tempoAddress: string;
	treasuryName: string;
	authenticatedAt: number;
}

function forgeSessionCookie(data: SessionData): string {
	const payload = Buffer.from(JSON.stringify(data)).toString("base64");
	const signature = createHmac("sha256", DEV_SECRET)
		.update(payload)
		.digest("hex");
	return `${payload}.${signature}`;
}

/**
 * Set a forged auth session cookie on a Playwright browser context.
 * Uses the dev HMAC secret to create a valid session without passkey auth.
 */
export async function authenticateContext(
	context: BrowserContext,
	opts: { treasuryId: string; tempoAddress: string; treasuryName: string },
): Promise<void> {
	const cookie = forgeSessionCookie({
		...opts,
		authenticatedAt: Date.now(),
	});

	await context.addCookies([
		{
			name: COOKIE_NAME,
			value: cookie,
			domain: "localhost",
			path: "/",
			httpOnly: true,
			secure: false,
			sameSite: "Lax",
		},
	]);
}
