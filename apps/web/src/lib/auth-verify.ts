import { cookies } from "next/headers";
import { getTempoClient } from "./tempo/client";

export type AuthFlow = "login" | "create";

const AUTH_CHALLENGE_PREFIX = "goldhord-auth-challenge";

function challengeCookieName(flow: AuthFlow): string {
	return `${AUTH_CHALLENGE_PREFIX}-${flow}`;
}

/**
 * Store a random challenge in an httpOnly cookie and return it.
 * The client must sign this challenge with the wallet to prove ownership.
 * Each flow gets its own cookie slot to prevent cross-tab race conditions.
 */
export async function createAuthChallenge(flow: AuthFlow): Promise<string> {
	const challenge = crypto.randomUUID();
	const cookieStore = await cookies();
	cookieStore.set(challengeCookieName(flow), challenge, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: 300, // 5 minutes
		path: "/",
	});
	return challenge;
}

/**
 * Read and delete the challenge cookie (single-use).
 * Returns null if no challenge is pending or it expired.
 */
export async function consumeAuthChallenge(flow: AuthFlow): Promise<string | null> {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(challengeCookieName(flow));
	if (!cookie?.value) return null;
	cookieStore.delete(challengeCookieName(flow));
	return cookie.value;
}

/**
 * Verify that `signature` is a valid signature of `challenge` by `address`.
 * Uses the Tempo RPC to handle WebAuthn/P256 signature verification
 * via the Account Keychain Precompile.
 */
export async function verifyWalletSignature(
	address: string,
	signature: string,
	challenge: string,
): Promise<boolean> {
	const client = getTempoClient();
	return client.verifyMessage({
		address: address as `0x${string}`,
		message: challenge,
		signature: signature as `0x${string}`,
	});
}
