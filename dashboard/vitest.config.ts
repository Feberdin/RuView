/**
 * Purpose: Keep browser accessibility tests out of the Vitest unit-test run.
 * Input/output: Vitest reads this file and discovers future unit tests normally.
 * Invariant: Playwright owns tests/a11y.spec.ts; Vitest must never execute it.
 * Debugging: Run `npm test` here and `npm run test:a11y` for browser tests.
 */

import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'tests/a11y.spec.ts'],
    // The dashboard currently has browser tests only. Keep this command useful
    // until the first unit test is added without misclassifying that as failure.
    passWithNoTests: true,
  },
});
