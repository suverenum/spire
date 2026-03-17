"use server";

import { getSession } from "@/lib/session";
import { sendPaymentSchema } from "@/lib/validations";

/**
 * Server-side validation for payment parameters.
 * The actual transaction is now signed and sent client-side via wagmi/tempo.
 */
export async function validatePaymentAction(
  formData: FormData,
): Promise<{ valid: boolean; error?: string }> {
  const session = await getSession();
  if (!session) {
    return { valid: false, error: "Not authenticated" };
  }

  const raw = {
    to: formData.get("to"),
    amount: formData.get("amount"),
    token: formData.get("token"),
    memo: formData.get("memo") || undefined,
  };

  const parsed = sendPaymentSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return {
      valid: false,
      error: firstError?.message ?? "Invalid input",
    };
  }

  return { valid: true };
}
