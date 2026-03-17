"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { treasuries } from "@/db/schema";
import { createSession, getSession } from "@/lib/session";
import { createTreasurySchema } from "@/lib/validations";
import { eq } from "drizzle-orm";

function generateMockAddress(): `0x${string}` {
  const chars = "0123456789abcdef";
  let addr = "0x";
  for (let i = 0; i < 40; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr as `0x${string}`;
}

export async function createTreasuryAction(
  formData: FormData,
): Promise<{ error?: string }> {
  const raw = { name: formData.get("name") };
  const parsed = createTreasurySchema.safeParse(raw);

  if (!parsed.success) {
    return { error: "Please enter a valid treasury name." };
  }

  const tempoAddress = generateMockAddress();

  const [treasury] = await db
    .insert(treasuries)
    .values({
      name: parsed.data.name,
      tempoAddress,
    })
    .returning();

  await createSession({
    treasuryId: treasury.id,
    tempoAddress: treasury.tempoAddress as `0x${string}`,
    treasuryName: treasury.name,
  });

  redirect("/dashboard");
}

export async function updateTreasuryNameAction(
  formData: FormData,
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const name = formData.get("name") as string;
  if (!name || name.length > 100) {
    return { error: "Please enter a valid name." };
  }

  await db
    .update(treasuries)
    .set({ name })
    .where(eq(treasuries.id, session.treasuryId));

  await createSession({
    treasuryId: session.treasuryId,
    tempoAddress: session.tempoAddress,
    treasuryName: name,
  });

  return {};
}
