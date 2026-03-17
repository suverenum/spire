"use server";

import { getSession } from "@/lib/session";
import { sendPaymentSchema } from "@/lib/validations";

export interface SendPaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
  gasless: boolean;
}

export async function sendPaymentAction(
  formData: FormData,
): Promise<SendPaymentResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Not authenticated", gasless: false };
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
      success: false,
      error: firstError?.message ?? "Invalid input",
      gasless: false,
    };
  }

  // TODO: Replace mock with real Tempo SDK call:
  //   const tokenConfig = SUPPORTED_TOKENS[token as TokenName];
  //   const feePayer = getFeePayer();
  //   client.token.transferSync({ amount, to, token: tokenConfig.address, memo, feePayer })
  const mockHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

  return {
    success: true,
    txHash: mockHash,
    gasless: true,
  };
}
