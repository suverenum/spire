import { createHmac } from "node:crypto";
import type { BrowserContext } from "@playwright/test";

/**
 * Load the session secret that matches what the app server is using.
 *
 * Uses SESSION_SECRET env var if set (CI, external runs), otherwise falls back
 * to "playwright-session-secret" which matches playwright.config.ts webServer.env.
 *
 * Does NOT read .env.local — the Playwright webServer always receives its secret
 * via webServer.env, so the auth helper must use the same source of truth.
 * When reusing an existing dev server, set SESSION_SECRET in the shell env.
 */
function loadSessionSecret(): string {
	return process.env.SESSION_SECRET || "playwright-session-secret";
}

function getCookieDomain(): string {
	const baseUrl = process.env.BASE_URL;
	if (baseUrl) {
		try {
			return new URL(baseUrl).hostname;
		} catch {
			// fall through
		}
	}
	return "localhost";
}

const DEV_SECRET = loadSessionSecret();
const COOKIE_DOMAIN = getCookieDomain();
const COOKIE_NAME = COOKIE_DOMAIN !== "localhost" ? "__Host-goldhord-session" : "goldhord-session";

interface SessionData {
	treasuryId: string;
	tempoAddress: string;
	treasuryName: string;
	authenticatedAt: number;
}

function forgeSessionCookie(data: SessionData): string {
	const payload = Buffer.from(JSON.stringify(data)).toString("base64");
	const signature = createHmac("sha256", DEV_SECRET).update(payload).digest("hex");
	return `${payload}.${signature}`;
}

/**
 * Set a forged auth session cookie on a Playwright browser context.
 * Uses the session secret to create a valid session without passkey auth.
 * Cookie domain and name adapt to BASE_URL for external environments.
 */
export async function authenticateContext(
	context: BrowserContext,
	opts: {
		treasuryId: string;
		tempoAddress: string;
		treasuryName: string;
		authenticatedAt?: number;
	},
): Promise<void> {
	const cookie = forgeSessionCookie({
		treasuryId: opts.treasuryId,
		tempoAddress: opts.tempoAddress,
		treasuryName: opts.treasuryName,
		authenticatedAt: opts.authenticatedAt ?? Date.now(),
	});

	const isExternal = COOKIE_DOMAIN !== "localhost";
	const baseUrl = process.env.BASE_URL || "http://localhost:11000";
	await context.addCookies([
		{
			name: COOKIE_NAME,
			value: cookie,
			...(isExternal ? { url: baseUrl } : { domain: COOKIE_DOMAIN }),
			path: "/",
			httpOnly: true,
			secure: isExternal,
			sameSite: "Lax",
		},
	]);
}
