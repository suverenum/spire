import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrowserContext } from "@playwright/test";

/** Must match SESSION_SECRET in playwright.config.ts webServer.env */
const PLAYWRIGHT_SESSION_SECRET = "playwright-session-secret";

function loadSessionSecret(): string {
	if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
	try {
		const thisDir = dirname(fileURLToPath(import.meta.url));
		const envPath = resolve(thisDir, "../../.env.local");
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
		// .env.local not found — use the same secret as playwright.config.ts
	}
	return PLAYWRIGHT_SESSION_SECRET;
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
const COOKIE_NAME = "goldhord-session";
const COOKIE_DOMAIN = getCookieDomain();

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
 * Uses the dev HMAC secret to create a valid session without passkey auth.
 * Cookie domain is derived from BASE_URL env var (defaults to localhost).
 */
export async function authenticateContext(
	context: BrowserContext,
	opts: {
		treasuryId: string;
		tempoAddress: string;
		treasuryName: string;
		/** Override authenticatedAt for expiry testing. Defaults to Date.now(). */
		authenticatedAt?: number;
	},
): Promise<void> {
	const cookie = forgeSessionCookie({
		treasuryId: opts.treasuryId,
		tempoAddress: opts.tempoAddress,
		treasuryName: opts.treasuryName,
		authenticatedAt: opts.authenticatedAt ?? Date.now(),
	});

	await context.addCookies([
		{
			name: COOKIE_NAME,
			value: cookie,
			domain: COOKIE_DOMAIN,
			path: "/",
			httpOnly: true,
			secure: COOKIE_DOMAIN !== "localhost",
			sameSite: "Lax",
		},
	]);
}
