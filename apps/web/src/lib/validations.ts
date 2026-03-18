import z from "zod";

export const addressSchema = z
	.string()
	.regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address format (0x...)");

export const sendPaymentSchema = z.object({
	to: addressSchema,
	amount: z
		.string()
		.regex(/^(0|[1-9]\d*)(\.\d{1,6})?$/, "Amount must be a valid number")
		.refine((v) => Number(v) > 0, "Amount must be greater than 0"),
	token: z.enum(["AlphaUSD", "BetaUSD", "pathUSD", "ThetaUSD"]),
	memo: z
		.string()
		.refine(
			(v) => new TextEncoder().encode(v).length <= 32,
			"Memo must be 32 bytes or less",
		)
		.optional(),
});

export const createTreasurySchema = z.object({
	name: z.string().min(1).max(100),
});

export const accountNameSchema = z.string().min(1).max(100);

export const createAccountSchema = z.object({
	name: accountNameSchema,
	tokenSymbol: z.enum(["AlphaUSD", "BetaUSD"]),
});

export const renameAccountSchema = z.object({
	accountId: z.string().uuid(),
	name: accountNameSchema,
});
