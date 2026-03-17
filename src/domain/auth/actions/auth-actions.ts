"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, getSession } from "@/lib/session";
import { db } from "@/db";
import { treasuries } from "@/db/schema";
import { eq } from "drizzle-orm";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function loginAction(
  treasuryId: string,
  connectedAddress: string,
): Promise<{ error?: string; tempoAddress?: string }> {
  if (!UUID_RE.test(treasuryId)) {
    return { error: "Invalid treasury ID" };
  }

  if (!ADDRESS_RE.test(connectedAddress)) {
    return { error: "Invalid wallet address" };
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
