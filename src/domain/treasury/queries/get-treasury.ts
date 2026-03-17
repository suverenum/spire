import { db } from "@/db";
import { treasuries } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getTreasury(id: string) {
  const result = await db
    .select()
    .from(treasuries)
    .where(eq(treasuries.id, id));
  return result[0] ?? null;
}
