import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * ESLint 9 flat config. `eslint-config-next` 16 ships flat-config arrays from
 * its subpath exports, so they spread directly. No formatter is used in this
 * repository, so there is no `eslint-config-prettier` layer.
 */
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "next-env.d.ts",
      "public/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default config;
