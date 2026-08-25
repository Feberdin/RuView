/**
 * Purpose: Lint the RuView CLI with ESLint's supported flat configuration.
 * Input/Output: CLI TypeScript sources in; actionable diagnostics out.
 * Invariants: Only source files are inspected; build output stays excluded.
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
  rules: { ...typescriptPlugin.configs.recommended.rules },
}];
