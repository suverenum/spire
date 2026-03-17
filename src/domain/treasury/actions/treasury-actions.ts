"use server";

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { treasuries } from "@/db/schema";
import { createSession, getSession } from "@/lib/session";
import { createTreasurySchema } from "@/lib/validations";
import { TEMPO_RPC_URL } from "@/lib/constants";
import { eq, sql } from "drizzle-orm";
import { getTempoClient } from "@/lib/tempo/client";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const SIGNATURE_RE = /^0x[a-fA-F0-9]+$/;

const CREATE_CHALLENGE_COOKIE = "spire-create-challenge";
const CREATE_CHALLENGE_MAX_AGE = 120; // 2 minutes

export async function getCreateChallengeAction(): Promise<string> {
  const nonce = randomBytes(32).toString("hex");
  const challenge = `Create Spire treasury: ${nonce}`;
  const cookieStore = await cookies();
  cookieStore.set(CREATE_CHALLENGE_COOKIE, challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: CREATE_CHALLENGE_MAX_AGE,
    path: "/",
  });
  return challenge;
}

export async function createTreasuryAction(
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const raw = { name: formData.get("name") };
  const parsed = createTreasurySchema.safeParse(raw);

  if (!parsed.success) {
    return { error: "Please enter a valid treasury name." };
  }

  const tempoAddress = formData.get("tempoAddress") as string;
  if (!tempoAddress || !ADDRESS_RE.test(tempoAddress)) {
    return { error: "Invalid Tempo address from passkey." };
  }

  // Verify the challenge signature to prove key ownership
  const signature = formData.get("signature") as string;
  if (!signature || !SIGNATURE_RE.test(signature)) {
    return { error: "Missing passkey signature." };
  }

  const cookieStore = await cookies();
  const challengeCookie = cookieStore.get(CREATE_CHALLENGE_COOKIE);
  if (!challengeCookie?.value) {
    return { error: "Challenge expired. Please try again." };
  }
  cookieStore.delete(CREATE_CHALLENGE_COOKIE);

  const client = getTempoClient();
  try {
    const valid = await client.verifyMessage({
      address: tempoAddress as `0x${string}`,
      message: challengeCookie.value,
      signature: signature as `0x${string}`,
    });
    if (!valid) {
      return { error: "Passkey verification failed." };
    }
  } catch {
    return { error: "Passkey verification failed." };
  }

  // Atomic check-and-insert with DB-level singleton guard.
  // The WHERE NOT EXISTS prevents most concurrent duplicates, and the
  // singleton_guard UNIQUE constraint catches any remaining race window.
  let row: { id: string; name: string; tempo_address: string } | undefined;
  try {
    const result = await db.execute<{
      id: string;
      name: string;
      tempo_address: string;
    }>(
      sql`INSERT INTO treasuries (name, tempo_address)
          SELECT ${parsed.data.name}, ${tempoAddress}
          WHERE NOT EXISTS (SELECT 1 FROM treasuries LIMIT 1)
          RETURNING id, name, tempo_address`,
    );
    row = result.rows[0];
  } catch (err: unknown) {
    // Unique constraint violation (PostgreSQL SQLSTATE 23505) = concurrent race lost.
    // Covers the singleton_guard constraint (and the unlikely tempo_address collision).
    const pgCode =
      err != null && typeof err === "object" && "code" in err
        ? (err as { code: unknown }).code
        : undefined;
    if (pgCode === "23505") {
      return {
        error: "A treasury already exists. Only one treasury is supported.",
      };
    }
    throw err;
  }

  if (!row) {
    return {
      error: "A treasury already exists. Only one treasury is supported.",
    };
  }

  // Auto-fund wallet via Tempo testnet faucet (best-effort, non-blocking)
  try {
    await fetch(TEMPO_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tempo_fundAddress",
        params: [row.tempo_address],
        id: 1,
      }),
    });
  } catch {
    // Faucet failure is non-fatal on testnet
  }

  await createSession({
    treasuryId: row.id,
    tempoAddress: row.tempo_address as `0x${string}`,
    treasuryName: row.name,
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
