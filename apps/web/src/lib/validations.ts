import z from "zod";
import { ACCOUNT_TOKENS, SUPPORTED_TOKENS } from "./constants";

export const addressSchema = z
	.string()
	.regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address format (0x...)");

// Derive valid token names from runtime config
const allTokenNames = Object.keys(SUPPORTED_TOKENS) as [string, ...string[]];
const accountTokenNames = ACCOUNT_TOKENS.map((t) => t.name) as [string, ...string[]];

export const sendPaymentSchema = z.object({
	to: addressSchema,
	amount: z
		.string()
		.regex(/^(0|[1-9]\d*)(\.\d{1,6})?$/, "Amount must be a valid number")
		.refine((v) => Number(v) > 0, "Amount must be greater than 0"),
	token: z.enum(allTokenNames),
	memo: z
		.string()
		.refine((v) => new TextEncoder().encode(v).length <= 32, "Memo must be 32 bytes or less")
		.optional(),
});

export const createTreasurySchema = z.object({
	name: z.string().min(1).max(100),
});

export const accountNameSchema = z.string().min(1).max(100);

export const createAccountSchema = z.object({
	name: accountNameSchema,
	tokenSymbol: z.enum(accountTokenNames),
});

export const renameAccountSchema = z.object({
	accountId: z.string().uuid(),
	name: accountNameSchema,
});
