import nextConfig from "eslint-config-next";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextConfig,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    rules: {
      // eslint-config-next 16 enables React Compiler-style rules; this repo predates those patterns.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/error-boundaries": "off",
      "react-hooks/static-components": "off",
    },
  },
  {
    files: ["tests/**/*", "**/*.test.{ts,tsx}"],
    rules: {
      "@next/next/no-assign-module-variable": "off",
    },
  },
];

export default config;
