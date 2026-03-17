"use server";

import { revalidatePath } from "next/cache";
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
): Promise<{ error?: string; success?: boolean }> {
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

  return { success: true };
}

export async function updateTreasuryNameAction(
  formData: FormData,
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const raw = { name: formData.get("name") };
  const parsed = createTreasurySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please enter a valid name." };
  }
  const name = parsed.data.name;

  await db
    .update(treasuries)
    .set({ name })
    .where(eq(treasuries.id, session.treasuryId));

  await createSession({
    treasuryId: session.treasuryId,
    tempoAddress: session.tempoAddress,
    treasuryName: name,
  });

  revalidatePath("/dashboard");
  revalidatePath("/settings");

  return {};
}
