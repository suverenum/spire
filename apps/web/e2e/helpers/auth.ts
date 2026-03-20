import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrowserContext } from "@playwright/test";

function loadSessionSecret(): string {
	if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
	try {
		const thisDir = dirname(fileURLToPath(import.meta.url));
		const envPath = resolve(thisDir, "../../.env.local");
		const content = readFileSync(envPath, "utf-8");
		const match = content.match(/^SESSION_SECRET=(.+)$/m);
		if (match) {
			let secret = match[1].trim();
			// Strip surrounding quotes (dotenv semantics)
			if (
				(secret.startsWith('"') && secret.endsWith('"')) ||
				(secret.startsWith("'") && secret.endsWith("'"))
			) {
				secret = secret.slice(1, -1);
			}
			// Strip inline comments
			const commentIdx = secret.indexOf(" #");
			if (commentIdx !== -1) secret = secret.slice(0, commentIdx).trim();
			return secret;
		}
	} catch {
		// fallback when .env.local not found
	}
	return "dev-secret-change-in-production";
}

const DEV_SECRET = loadSessionSecret();
const COOKIE_NAME = "goldhord-session";

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
