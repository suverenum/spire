"use server";

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, destroySession, getSession } from "@/lib/session";
import { db } from "@/db";
import { treasuries } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTempoClient } from "@/lib/tempo/client";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const SIGNATURE_RE = /^0x[a-fA-F0-9]+$/;

const AUTH_CHALLENGE_COOKIE = "spire-auth-challenge";
const AUTH_CHALLENGE_MAX_AGE = 120; // 2 minutes

export async function getLoginChallengeAction(): Promise<string> {
  const nonce = randomBytes(32).toString("hex");
  const challenge = `Sign in to Spire: ${nonce}`;
  const cookieStore = await cookies();
  cookieStore.set(AUTH_CHALLENGE_COOKIE, challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: AUTH_CHALLENGE_MAX_AGE,
    path: "/",
  });
  return challenge;
}

export async function loginAction(
  treasuryId: string,
  connectedAddress: string,
  signature: string,
): Promise<{ error?: string; tempoAddress?: string }> {
  if (!UUID_RE.test(treasuryId)) {
    return { error: "Invalid treasury ID" };
  }

  if (!ADDRESS_RE.test(connectedAddress)) {
    return { error: "Invalid wallet address" };
  }

  if (!signature || !SIGNATURE_RE.test(signature)) {
    return { error: "Invalid signature" };
  }

  // Verify the challenge signature to prove key ownership
  const cookieStore = await cookies();
  const challengeCookie = cookieStore.get(AUTH_CHALLENGE_COOKIE);
  if (!challengeCookie?.value) {
    return { error: "Login challenge expired. Please try again." };
  }
  cookieStore.delete(AUTH_CHALLENGE_COOKIE);

  const client = getTempoClient();
  try {
    const valid = await client.verifyMessage({
      address: connectedAddress as `0x${string}`,
      message: challengeCookie.value,
      signature: signature as `0x${string}`,
    });
    if (!valid) {
      return { error: "Passkey verification failed" };
    }
  } catch {
    return { error: "Passkey verification failed" };
  }

  const result = await db
    .select()
    .from(treasuries)
    .where(eq(treasuries.id, treasuryId));
  const treasury = result[0];

  if (!treasury) {
    return { error: "Treasury not found" };
  }

  if (treasury.tempoAddress.toLowerCase() !== connectedAddress.toLowerCase()) {
    return { error: "Passkey does not match this treasury" };
  }

  await createSession({
    treasuryId: treasury.id,
    tempoAddress: treasury.tempoAddress as `0x${string}`,
    treasuryName: treasury.name,
  });

  return { tempoAddress: treasury.tempoAddress };
}

export async function touchSessionAction(): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await createSession({
    treasuryId: session.treasuryId,
    tempoAddress: session.tempoAddress,
    treasuryName: session.treasuryName,
  });
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
