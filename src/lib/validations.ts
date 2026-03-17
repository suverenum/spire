import { z } from "zod/v4";

export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

export const sendPaymentSchema = z.object({
  to: addressSchema,
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/),
  token: z.enum(["AlphaUSD", "BetaUSD", "pathUSD", "ThetaUSD"]),
  memo: z.string().max(256).optional(),
});

export const createTreasurySchema = z.object({
  name: z.string().min(1).max(100),
});

export type SendPaymentInput = z.infer<typeof sendPaymentSchema>;
export type CreateTreasuryInput = z.infer<typeof createTreasurySchema>;
