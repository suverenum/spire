import { withSentryConfig } from "@sentry/nextjs";
import withSerwist from "@serwist/next";

const nextConfig = {
	reactCompiler: true,
	cacheComponents: true,
	transpilePackages: [],
	turbopack: {},
	experimental: {
		viewTransition: true,
		optimizePackageImports: ["lucide-react", "@tanstack/react-query", "viem"],
	},
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{
						key: "Strict-Transport-Security",
						value: "max-age=63072000; includeSubDomains; preload",
					},
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "DENY" },
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin",
					},
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=()",
					},
					{
						key: "Content-Security-Policy",
						value: [
							"default-src 'self'",
							// unsafe-eval only in dev (React needs it for debugging); unsafe-inline kept until nonce migration
							`script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://vercel.live https://us-assets.i.posthog.com`,
							"style-src 'self' 'unsafe-inline'",
							"img-src 'self' data: blob:",
							"font-src 'self'",
							`connect-src 'self' ${[process.env.NEXT_PUBLIC_TEMPO_RPC_HTTP, process.env.NEXT_PUBLIC_TEMPO_RPC_WS, process.env.NEXT_PUBLIC_TEMPO_SPONSOR_URL, "https://*.ingest.sentry.io", "https://us.i.posthog.com", "https://us-assets.i.posthog.com"].filter(Boolean).join(" ")}`,
							"frame-src https://vercel.live",
							"frame-ancestors 'none'",
						].join("; "),
					},
				],
			},
		];
	},
};

const withSW = withSerwist({
	swSrc: "src/sw.ts",
	swDest: "public/sw.js",
	disable: process.env.NODE_ENV === "development",
});

export default withSentryConfig(withSW(nextConfig), {
	org: "suverenum",
	project: "goldhord",
	silent: !process.env.CI,
	widenClientFileUpload: true,
	tunnelRoute: "/monitoring",
	webpack: {
		automaticVercelMonitors: true,
		treeshake: {
			removeDebugLogging: true,
		},
	},
});
