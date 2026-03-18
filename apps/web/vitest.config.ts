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
		environment: "jsdom",
		include: ["src/**/*.test.{ts,tsx}"],
		setupFiles: ["./src/test/setup.ts"],
		coverage: {
			provider: "v8",
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				"src/test/**",
				"src/**/*.test.{ts,tsx}",
				"src/app/layout.tsx",
				"src/app/globals.css",
				"src/sw.ts",
				"src/app/**/page.tsx",
				"src/app/api/**",
				"src/db/index.ts",
				"src/components/providers.tsx",
				"src/lib/idb-persister.ts",
				"src/lib/session.ts",
				"src/domain/**/actions/**",
				"src/domain/**/queries/**",
				"src/domain/**/hooks/**",
				"src/lib/tempo/types.ts",
				"src/lib/tempo/client.ts",
				"src/app/**/dashboard-content.tsx",
				"src/app/**/dashboard-recent-transactions.tsx",
				"src/app/**/transactions-content.tsx",
				"src/app/**/transaction-detail-content.tsx",
				"src/app/**/settings-content.tsx",
				"src/app/**/accounts-content.tsx",
				"src/app/**/account-detail-content.tsx",
				"src/app/**/swap-content.tsx",
				"src/app/create/page.tsx",
				"src/app/global-error.tsx",
				"src/sentry-*.ts",
				"src/instrumentation.ts",
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
