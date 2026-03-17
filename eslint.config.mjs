import nextConfig from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextConfig,
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/",
      "node_modules/",
      "e2e/",
      "drizzle/",
      "public/sw.js",
      "coverage/",
    ],
  },
];

export default eslintConfig;
