/**
 * Purpose: Lint the rvagent MCP server with ESLint's supported flat config.
 * Input/Output: MCP TypeScript sources in; actionable diagnostics out.
 * Invariants: Only source files are inspected; generated dist files are excluded.
 * Debugging: Run `npm run lint` and inspect the first reported source location.
 */

import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [{
  files: ['src/**/*.ts'],
  languageOptions: {
    ecmaVersion: 'latest',
    parser: typescriptParser,
    parserOptions: { sourceType: 'module' },
  },
  plugins: { '@typescript-eslint': typescriptPlugin },
  rules: {
    ...typescriptPlugin.configs.recommended.rules,
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
}];
