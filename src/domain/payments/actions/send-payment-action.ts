"use server";

import { getSession } from "@/lib/session";
import { sendPaymentSchema } from "@/lib/validations";

export interface SendPaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export async function sendPaymentAction(
  formData: FormData,
): Promise<SendPaymentResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
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
    return { success: false, error: firstError?.message ?? "Invalid input" };
  }

  // In a real implementation, this would use the Tempo SDK to submit the transfer.
  // For MVP testnet, we simulate the transaction submission.
  // The actual balance changes come from on-chain events via the WebSocket subscription.
  try {
    // Simulate transaction hash generation
    const mockHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

    return {
      success: true,
      txHash: mockHash,
    };
  } catch {
    return { success: false, error: "Transaction failed. Please try again." };
  }
}
