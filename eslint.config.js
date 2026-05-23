import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/.codex-output/**",
      "**/.playwright-mcp/**",
      "**/.tmp/**",
      "**/.worktrees/**",
      "**/dist/**",
      "**/dist-packaged/**",
      "**/docs/manual-qa/**/*.js",
      "**/docs/manual-qa/**/*.mjs",
      "**/node_modules/**",
      "**/.pnpm-store/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/.vite/**",
      "**/.tsbuildinfo/**",
      "**/*.config.js"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/**/*.ts", "apps/**/*.tsx", "packages/**/*.ts", "*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {
      "no-undef": "off",
      "no-console": "off",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"]
    }
  },
  {
    files: ["apps/**/*.mjs", "packages/**/*.mjs", "scripts/**/*.mjs", "*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        Buffer: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        URL: "readonly"
      }
    }
  },
  {
    files: ["**/*.d.ts"],
    rules: {
      "@typescript-eslint/consistent-type-definitions": "off"
    }
  }
];
