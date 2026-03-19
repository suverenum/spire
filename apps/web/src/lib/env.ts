import { z } from "zod";

const addressPattern = /^0x[a-fA-F0-9]{40}$/;

const tokenSchema = z.object({
	name: z.string(),
	symbol: z.string(),
	decimals: z.number(),
	address: z.string().regex(addressPattern),
});

const envSchema = z.object({
	// Chain
	NEXT_PUBLIC_TEMPO_CHAIN_ID: z.coerce.number(),
	NEXT_PUBLIC_TEMPO_RPC_HTTP: z.string().url(),
	NEXT_PUBLIC_TEMPO_RPC_WS: z.string().startsWith("wss://"),
	NEXT_PUBLIC_TEMPO_SPONSOR_URL: z.string().url().optional(),
	NEXT_PUBLIC_TEMPO_EXPLORER_URL: z.string().url(),

	// Tokens (JSON string → parsed array)
	NEXT_PUBLIC_TOKENS: z.string().transform((s) => z.array(tokenSchema).parse(JSON.parse(s))),
	NEXT_PUBLIC_DEFAULT_TOKEN: z.string(),

	// Contracts
	NEXT_PUBLIC_MULTISIG_FACTORY: z.string().regex(addressPattern).optional(),
	NEXT_PUBLIC_GUARD_FACTORY: z.string().regex(addressPattern).optional(),

	// App
	NEXT_PUBLIC_APP_ENV: z.enum(["development", "production"]).default("development"),
	NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

type Env = z.infer<typeof envSchema>;

let _env: Env | undefined;

function getEnv(): Env {
	if (!_env) {
		_env = envSchema.parse({
			NEXT_PUBLIC_TEMPO_CHAIN_ID: process.env.NEXT_PUBLIC_TEMPO_CHAIN_ID,
			NEXT_PUBLIC_TEMPO_RPC_HTTP: process.env.NEXT_PUBLIC_TEMPO_RPC_HTTP,
			NEXT_PUBLIC_TEMPO_RPC_WS: process.env.NEXT_PUBLIC_TEMPO_RPC_WS,
			NEXT_PUBLIC_TEMPO_SPONSOR_URL: process.env.NEXT_PUBLIC_TEMPO_SPONSOR_URL,
			NEXT_PUBLIC_TEMPO_EXPLORER_URL: process.env.NEXT_PUBLIC_TEMPO_EXPLORER_URL,
			NEXT_PUBLIC_TOKENS: process.env.NEXT_PUBLIC_TOKENS,
			NEXT_PUBLIC_DEFAULT_TOKEN: process.env.NEXT_PUBLIC_DEFAULT_TOKEN,
			NEXT_PUBLIC_MULTISIG_FACTORY: process.env.NEXT_PUBLIC_MULTISIG_FACTORY,
			NEXT_PUBLIC_GUARD_FACTORY: process.env.NEXT_PUBLIC_GUARD_FACTORY,
			NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
			NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
		});
	}
	return _env;
}

// Lazy proxy — validates on first property access, not on import
export const env: Env = new Proxy({} as Env, {
	get(_, prop: string) {
		return getEnv()[prop as keyof Env];
	},
});

export const IS_PRODUCTION = process.env.NEXT_PUBLIC_APP_ENV === "production";
export const IS_TESTNET = !IS_PRODUCTION;
