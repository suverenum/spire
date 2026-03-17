"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, getSession } from "@/lib/session";
import { db } from "@/db";
import { treasuries } from "@/db/schema";
import { eq } from "drizzle-orm";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loginAction(
  treasuryId: string,
): Promise<{ error?: string }> {
  if (!UUID_RE.test(treasuryId)) {
    return { error: "Invalid treasury ID" };
  }

  const result = await db
    .select()
    .from(treasuries)
    .where(eq(treasuries.id, treasuryId));
  const treasury = result[0];

  if (!treasury) {
    return { error: "Treasury not found" };
  }

  await createSession({
    treasuryId: treasury.id,
    tempoAddress: treasury.tempoAddress as `0x${string}`,
    treasuryName: treasury.name,
  });

  redirect("/dashboard");
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
