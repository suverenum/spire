import nextConfig from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
	...nextConfig,
	...nextCoreWebVitals,
	...nextTypescript,
	{
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			parserOptions: {
				projectService: true,
			},
		},
		rules: {
			// Strict type-safety
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/no-unnecessary-type-assertion": "error",
			"@typescript-eslint/prefer-nullish-coalescing": "warn",

			// Consistent code style
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{ prefer: "type-imports", fixStyle: "inline-type-imports" },
			],
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
			],

			// Async safety
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": [
				"error",
				{ checksVoidReturn: { attributes: false } },
			],
		},
	},
	{
		files: ["**/*.test.ts", "**/*.test.tsx"],
		rules: {
			"@typescript-eslint/consistent-type-imports": "off",
		},
	},
	{
		ignores: [
			".next/",
			"node_modules/",
			"e2e/",
			"drizzle/",
			"public/sw.js",
			"coverage/",
			"src/sw.ts",
		],
	},
];

export default eslintConfig;
