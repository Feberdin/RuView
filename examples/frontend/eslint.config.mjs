/**
 * Purpose: Lint the HOMECORE frontend with ESLint's supported flat config.
 * Input/Output: TypeScript sources in; actionable diagnostics out.
 * Invariants: TypeScript owns undefined-name checks; generated files are excluded.
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
