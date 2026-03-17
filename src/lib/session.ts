import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "./constants";

export interface SessionData {
  treasuryId: string;
  tempoAddress: `0x${string}`;
  treasuryName: string;
  authenticatedAt: number;
}

function encode(data: SessionData): string {
  return Buffer.from(JSON.stringify(data)).toString("base64");
}

function decode(value: string): SessionData | null {
  try {
    return JSON.parse(Buffer.from(value, "base64").toString("utf-8"));
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
