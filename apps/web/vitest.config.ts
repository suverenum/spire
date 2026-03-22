import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	test: {
		environment: "happy-dom",
		env: {
			NEXT_PUBLIC_TEMPO_CHAIN_ID: "42431",
			NEXT_PUBLIC_TEMPO_RPC_HTTP: "https://rpc.moderato.tempo.xyz",
			NEXT_PUBLIC_TEMPO_RPC_WS: "wss://rpc.moderato.tempo.xyz",
			NEXT_PUBLIC_TEMPO_SPONSOR_URL: "https://sponsor.moderato.tempo.xyz",
			NEXT_PUBLIC_TEMPO_EXPLORER_URL: "https://explore.tempo.xyz",
			NEXT_PUBLIC_TOKENS:
				'[{"name":"AlphaUSD","symbol":"AUSD","decimals":6,"address":"0x20c0000000000000000000000000000000000001"},{"name":"BetaUSD","symbol":"BUSD","decimals":6,"address":"0x20c0000000000000000000000000000000000002"}]',
			NEXT_PUBLIC_DEFAULT_TOKEN: "AlphaUSD",
			NEXT_PUBLIC_FEE_TOKEN: "0x20c0000000000000000000000000000000000000",
			NEXT_PUBLIC_APP_ENV: "development",
		},
		include: ["src/**/*.test.{ts,tsx}"],
		setupFiles: ["./src/test/setup.ts"],
		coverage: {
			provider: "v8",
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				// Test infrastructure
				"src/test/**",
				"src/**/*.test.{ts,tsx}",
				// Next.js framework files (not unit-testable)
				"src/app/layout.tsx",
				"src/app/globals.css",
				"src/sw.ts",
				"src/app/**/page.tsx",
				"src/app/global-error.tsx",
				"src/app/create/page.tsx",
				// Server-only code (requires Node APIs, can't run in happy-dom)
				"src/app/api/**",
				"src/db/index.ts",
				"src/lib/session.ts",
				"src/domain/**/actions/**",
				"src/domain/**/queries/**",
				// Runtime providers and instrumentation
				"src/components/providers.tsx",
				"src/lib/idb-persister.ts",
				"src/sentry-*.ts",
				"src/instrumentation.ts",
				// Type-only files
				"src/lib/tempo/types.ts",
			],
			thresholds: {
				lines: 90,
				functions: 90,
				branches: 90,
				statements: 90,
			},
		},
	},
});
