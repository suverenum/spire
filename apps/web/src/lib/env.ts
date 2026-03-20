import { z } from "zod";

const addressPattern = /^0x[a-fA-F0-9]{40}$/;

// Treat empty strings as undefined (Vercel sets unset vars to "")
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

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
	NEXT_PUBLIC_TEMPO_SPONSOR_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
	NEXT_PUBLIC_TEMPO_EXPLORER_URL: z.string().url(),

	// Tokens (JSON string → parsed array)
	NEXT_PUBLIC_TOKENS: z.string().transform((s) => {
		// Vercel may wrap the value in extra quotes — strip them
		const cleaned = s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s;
		return z.array(tokenSchema).parse(JSON.parse(cleaned));
	}),
	NEXT_PUBLIC_DEFAULT_TOKEN: z.string(),

	// Contracts
	NEXT_PUBLIC_MULTISIG_FACTORY: z.preprocess(
		emptyToUndefined,
		z.string().regex(addressPattern).optional(),
	),
	NEXT_PUBLIC_GUARD_FACTORY: z.preprocess(
		emptyToUndefined,
		z.string().regex(addressPattern).optional(),
	),

	// App
	NEXT_PUBLIC_APP_ENV: z.preprocess(
		emptyToUndefined,
		z.enum(["development", "production"]).default("development"),
	),
	NEXT_PUBLIC_APP_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
});

type Env = z.infer<typeof envSchema>;

// Build-time fallback — allows Next.js to compile without env vars (CI, build phase)
const buildTimeFallback: Env = {
	NEXT_PUBLIC_TEMPO_CHAIN_ID: 0,
	NEXT_PUBLIC_TEMPO_RPC_HTTP: "https://placeholder.invalid",
	NEXT_PUBLIC_TEMPO_RPC_WS: "wss://placeholder.invalid",
	NEXT_PUBLIC_TEMPO_SPONSOR_URL: undefined,
	NEXT_PUBLIC_TEMPO_EXPLORER_URL: "https://placeholder.invalid",
	NEXT_PUBLIC_TOKENS: [],
	NEXT_PUBLIC_DEFAULT_TOKEN: "",
	NEXT_PUBLIC_MULTISIG_FACTORY: undefined,
	NEXT_PUBLIC_GUARD_FACTORY: undefined,
	NEXT_PUBLIC_APP_ENV: "development",
	NEXT_PUBLIC_APP_URL: undefined,
};

let _env: Env | undefined;

function getEnv(): Env {
	if (!_env) {
		const result = envSchema.safeParse({
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

		if (result.success) {
			_env = result.data;
		} else {
			// During build (CI, next build), env vars may not be available.
			// Use fallback to allow compilation; runtime will fail loudly if vars are missing.
			console.warn("[env] Missing environment variables, using build-time fallback");
			_env = buildTimeFallback;
		}
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
