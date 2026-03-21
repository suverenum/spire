import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { BrowserContext } from "@playwright/test";

/**
 * Load the session secret that matches what the app server is using.
 *
 * Priority order:
 * 1. SESSION_SECRET env var (explicitly set — used in CI and external runs)
 * 2. .env.local file (developer's local secret — matches reused dev server)
 * 3. "playwright-session-secret" (matches playwright.config.ts webServer.env — CI fallback)
 */
function loadSessionSecret(): string {
	if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
	try {
		const envPath = resolve(process.cwd(), ".env.local");
		const content = readFileSync(envPath, "utf-8");
		const match = content.match(/^SESSION_SECRET\s*=\s*(.+)$/m);
		if (match) {
			let secret = match[1].trim();
			if (
				(secret.startsWith('"') && secret.endsWith('"')) ||
				(secret.startsWith("'") && secret.endsWith("'"))
			) {
				secret = secret.slice(1, -1);
			}
			const commentIdx = secret.indexOf(" #");
			if (commentIdx !== -1) secret = secret.slice(0, commentIdx).trim();
			return secret;
		}
	} catch {
		// .env.local not found
	}
	// Fallback: matches SESSION_SECRET in playwright.config.ts webServer.env
	return "playwright-session-secret";
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
