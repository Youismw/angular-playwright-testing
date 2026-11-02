/**
 * ============================================================================
 * COMPONENT:       Login Page
 * FOLDER:          playwright/login/performance/
 * MODULE:          login-performance.spec.ts
 * TAXONOMY:        6. Performance, Web Vitals & API Latency SLAs
 * ASSIGNED WORKER: Worker 2 (project: worker-2 | account: bot.worker2@quicktix.test)
 * WORKER BATCH:    Login Batch 2 of 2 (Folder Runtime: ~7.0s | Worker 2 Total: ~100.1s)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Evaluates client-side rendering performance, layout stability, and backend
 * authentication/reset latency budgets against CONTRACT.md SLAs:
 *   1. Navigation Timing & TTFB: Asserts `/login` Time-To-First-Byte (< 300ms)
 *      and DOMContentLoaded (< 2000ms) via W3C Navigation Timing Level 2 API.
 *   2. Cumulative Layout Shift (CLS): Observes `layout-shift` entries during
 *      initial render and tab transitions, asserting CLS < 0.05.
 *   3. Deterministic Reset SLA: Verifies `POST /api/test/reset` executes rapidly
 *      thanks to module-load precomputed bcrypt hashing.
 *   4. Login API Latency Budget: Verifies `POST /api/auth/login` completes
 *      within the target latency budget (< 300ms).
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import { TEST_USERS } from '../../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 2] — Runs on Worker 2 (Login Batch 2: ui-browser, specialized, visual, mutation, performance | ~100.1s)
test.describe('Login Component › Performance, Web Vitals & Latency SLAs', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Login page meets W3C Navigation Timing budgets (TTFB < 300ms, DOMContentLoaded < 2000ms)',
    { tag: ['@performance', '@login'] },
    async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByTestId('login-email')).toBeVisible();

      const timing = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find((e) => e.name === 'first-contentful-paint');
        return {
          ttfb: nav.responseStart - nav.requestStart,
          domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
          loadTime: nav.loadEventEnd - nav.startTime,
          fcp: fcp ? fcp.startTime : 0,
        };
      });

      expect(timing.ttfb).toBeGreaterThanOrEqual(0);
      expect(timing.ttfb).toBeLessThan(300);
      expect(timing.domContentLoaded).toBeLessThan(2000);
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Login card maintains Cumulative Layout Shift (CLS) below 0.05 during load and tab switches',
    { tag: ['@performance', '@login'] },
    async ({ page }) => {
      await page.addInitScript(() => {
        (window as any).__clsScore = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              (window as any).__clsScore += entry.value;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });
      });

      await page.goto('/login');
      await expect(page.getByTestId('login-email')).toBeVisible();

      // Exercise mode switches
      await page.getByTestId('tab-register').click();
      await page.getByTestId('tab-login').click();

      const clsScore = await page.evaluate(() => (window as any).__clsScore);
      expect(clsScore).toBeLessThan(0.05);
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'POST /api/test/reset executes within fast deterministic reset SLA (< 150ms)',
    { tag: ['@performance', '@api', '@login'] },
    async ({ request, assignedWorker }) => {
      // Warm-up request for preassigned Worker 2
      await request.post(`/api/test/reset?worker=${assignedWorker}`);

      const start = performance.now();
      const res = await request.post(`/api/test/reset?worker=${assignedWorker}`);
      const elapsedMs = performance.now() - start;

      expect(res.status()).toBe(200);
      expect(elapsedMs).toBeLessThan(150);
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'POST /api/auth/login responds within authentication latency budget (< 300ms)',
    { tag: ['@performance', '@api', '@login'] },
    async ({ request }) => {
      const start = performance.now();
      const res = await request.post('/api/auth/login', {
        data: {
          email: TEST_USERS.bot.email,
          password: TEST_USERS.bot.password,
        },
      });
      const elapsedMs = performance.now() - start;

      expect(res.status()).toBe(200);
      expect(elapsedMs).toBeLessThan(300);
    }
  );
});

