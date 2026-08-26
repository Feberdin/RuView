/* axe-core accessibility smoke against the built dashboard.
 * Closes ADR-092 §11.5 — formal axe scan.
 *
 * Runs against `npm run preview` (Vite preview server). Validates each
 * primary view (home / scene / apps / inspector / witness / ghost-murmur)
 * and asserts 0 critical/serious violations.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const VIEWS = ['home', 'scene', 'apps', 'inspector', 'witness', 'ghost-murmur'] as const;

test.describe('axe-core a11y smoke', () => {
  for (const view of VIEWS) {
    test(`view: ${view}`, async ({ page }) => {
      await page.goto('/');
      // The first-run decision is asynchronous because it comes from
      // IndexedDB. Wait for the modal before dismissing it so axe never scans
      // a half-faded transition or obscured dashboard by accident.
      await page.waitForFunction(() => {
        const sr = (document.querySelector('nv-app') as HTMLElement & { shadowRoot: ShadowRoot } | null)?.shadowRoot;
        return sr?.querySelector('nv-onboarding')?.hasAttribute('open') === true;
      });
      await page.evaluate(() => {
        const sr = (document.querySelector('nv-app') as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;
        const ob = sr.querySelector('nv-onboarding') as HTMLElement | null;
        (ob?.shadowRoot?.querySelector('.skip') as HTMLElement | null)?.click();
      });
      await page.waitForFunction(() => {
        const sr = (document.querySelector('nv-app') as HTMLElement & { shadowRoot: ShadowRoot } | null)?.shadowRoot;
        return sr?.querySelector('nv-onboarding')?.hasAttribute('open') === false;
      });
      // Navigate to the view via the rail button (except for home which is default).
      if (view !== 'home') {
        await page.evaluate((v) => {
          const sr = (document.querySelector('nv-app') as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;
          const rail = sr.querySelector('nv-rail') as HTMLElement & { shadowRoot: ShadowRoot };
          const btn = rail.shadowRoot.querySelector(`button[data-id=${v}-btn]`) as HTMLElement | null;
          btn?.click();
        }, view);
        await page.waitForTimeout(300);
      }

      const results = await new AxeBuilder({ page })
        .options({ runOnly: ['wcag2a', 'wcag2aa'] })
        .analyze();

      const critical = results.violations.filter((v) => v.impact === 'critical');
      const serious = results.violations.filter((v) => v.impact === 'serious');

      // Logging the violation summary makes CI failures readable.
      if (critical.length || serious.length) {
        for (const v of [...critical, ...serious]) {
          console.error(`[${view}] ${v.impact} · ${v.id} · ${v.help}`);
          for (const node of v.nodes) console.error(`    ${node.target.join(' >> ')}`);
        }
      }

      expect(critical.length, 'no critical violations').toBe(0);
      expect(serious.length, 'no serious violations').toBe(0);
    });
  }
});
