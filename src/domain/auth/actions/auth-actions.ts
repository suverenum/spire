"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/session";
import { db } from "@/db";
import { treasuries } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function loginAction(
  treasuryId: string,
): Promise<{ error?: string }> {
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

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
