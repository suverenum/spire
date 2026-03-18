import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "./constants";

export interface SessionData {
	treasuryId: string;
	tempoAddress: `0x${string}`;
	treasuryName: string;
	authenticatedAt: number;
}

function getSessionSecret(): string {
	const secret = process.env.SESSION_SECRET;
	if (!secret) {
		if (process.env.NODE_ENV === "production") {
			throw new Error("SESSION_SECRET must be set in production");
		}
		return "dev-secret-change-in-production";
	}
	return secret;
}

function sign(payload: string): string {
	return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

function encode(data: SessionData): string {
	const payload = Buffer.from(JSON.stringify(data)).toString("base64");
	const signature = sign(payload);
	return `${payload}.${signature}`;
}

function decode(value: string): SessionData | null {
	try {
		const dotIndex = value.lastIndexOf(".");
		if (dotIndex === -1) return null;

		const payload = value.slice(0, dotIndex);
		const signature = value.slice(dotIndex + 1);

		const expected = sign(payload);
		if (expected.length !== signature.length) return null;
		const isValid = timingSafeEqual(
			Buffer.from(expected),
			Buffer.from(signature),
		);
		if (!isValid) return null;

		return JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
	} catch {
		return null;
	}
}

export async function getSession(): Promise<SessionData | null> {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(SESSION_COOKIE_NAME);
	if (!cookie) return null;

	const session = decode(cookie.value);
	if (!session) return null;

	const elapsed = Date.now() - session.authenticatedAt;
	if (elapsed > SESSION_MAX_AGE_MS) {
		return null;
	}

	return session;
}

export async function createSession(
	data: Omit<SessionData, "authenticatedAt">,
): Promise<void> {
	const cookieStore = await cookies();
	const session: SessionData = {
		...data,
		authenticatedAt: Date.now(),
	};

	cookieStore.set(SESSION_COOKIE_NAME, encode(session), {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: SESSION_MAX_AGE_MS / 1000,
		path: "/",
	});
}

export async function destroySession(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.delete(SESSION_COOKIE_NAME);
}
