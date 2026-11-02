/**
 * ============================================================================
 * FOLDER: playwright/fixtures/
 * ============================================================================
 * Test runner extension layer providing custom fixtures, deterministic worker
 * routing, isolation hooks, and automatic state management for all suites.
 *
 * ============================================================================
 * MODULE: playwright/fixtures/base.fixture.ts (Deterministic 5-Worker Fixture)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Extends the base `@playwright/test` runner with deterministic 5-Worker
 * preassignment (`resolveAssignedWorker(testInfo.file)` -> Worker 1..5) and
 * high-speed worker-scoped browser context/page reuse:
 *   1. Binds `assignedWorker` (`1 | 2 | 3 | 4 | 5`) based on the test's folder
 *      rather than random `testInfo.parallelIndex`.
 *   2. Synchronizes `process.env.ASSIGNED_WORKER_INDEX` so `TEST_USERS.bot`,
 *      `TEST_USERS.other`, and `SEEDED_TICKETS` resolve to that worker's data.
 *   3. Fast Worker Page Reuse & Origin Reset: Reuses a persistent `BrowserContext`
 *      and `Page` per worker, resetting DOM, routes, cookies, viewport, and
 *      `localStorage` via `/__test_blank__` in ~5ms (eliminating the ~5s
 *      storageState page + ~2s Chromium renderer spawn overhead per test).
 *   4. Sends `POST /api/test/reset?worker=${assignedWorker}` before every test.
 *
 * ============================================================================
 * PREASSIGNED WORKER INITIALIZATION & TEST OWNERSHIP SUMMARY:
 * ============================================================================
 *   - WORKER 1 (.auth/user-1.json | bot.worker1@quicktix.test):
 *     * auth.setup/auth.setup.ts                (1 setup test)
 *     * login/functional/*.spec.ts              (5 files, 20 tests)
 *     * login/security/*.spec.ts                (2 files, 10 tests)
 *     * login/resilience/*.spec.ts              (1 file,   3 tests)
 *     * login/api/*.spec.ts                     (1 file,  12 tests)
 *
 *   - WORKER 2 (.auth/user-2.json | bot.worker2@quicktix.test):
 *     * login/ui-browser/*.spec.ts              (4 files, 16 tests)
 *     * login/specialized/*.spec.ts             (1 file,   6 tests)
 *     * login/visual/*.spec.ts                  (1 file,   4 tests)
 *     * login/mutation/*.spec.ts                (1 file,   3 tests)
 *     * login/performance/*.spec.ts             (1 file,   4 tests)
 *
 *   - WORKER 3 (.auth/user-3.json | bot.worker3@quicktix.test):
 *     * tickets/functional/*.spec.ts            (5 files, 28 tests)
 *     * tickets/resilience/*.spec.ts            (1 file,   7 tests)
 *     * tickets/api/*.spec.ts                   (1 file,  14 tests)
 *
 *   - WORKER 4 (.auth/user-4.json | bot.worker4@quicktix.test):
 *     * tickets/ui-browser/*.spec.ts            (4 files, 15 tests)
 *     * tickets/specialized/*.spec.ts           (1 file,   6 tests)
 *     * tickets/security/*.spec.ts              (3 files, 16 tests)
 *     * tickets/visual/*.spec.ts                (1 file,   5 tests)
 *     * tickets/mutation/*.spec.ts              (1 file,   3 tests)
 *     * tickets/performance/*.spec.ts           (1 file,   4 tests)
 *
 *   - WORKER 5 (.auth/user-5.json | bot.worker5@quicktix.test):
 *     * e2e/*.spec.ts                           (5 files,  5 tests)
 *     * [CATCH-ALL]: Any newly added .spec.ts file not preassigned to Workers 1-4.
 * ============================================================================
 */

import { test as baseTest, expect, BrowserContext, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { resolveAssignedWorker, AssignedWorkerId } from './worker-map.js';

// In-memory cache of worker JWT tokens parsed from .auth/user-1..5.json
const workerTokenCache = new Map<number, string>();

function getWorkerToken(workerId: number): string | null {
  const cached = workerTokenCache.get(workerId);
  if (cached) return cached;

  const baseDir = typeof __dirname !== 'undefined' ? __dirname : (import.meta as any).dirname || process.cwd();
  const candidateDirs = [
    path.resolve(process.cwd(), '.auth'),
    path.resolve(baseDir, '..', '.auth'),
    path.resolve(baseDir, '.auth'),
    path.resolve(process.cwd(), 'tests', '.auth'),
  ];
  const authDir = candidateDirs.find((d) => fs.existsSync(d)) || candidateDirs[0];
  const workerAuthFile = path.join(authDir, `user-${workerId}.json`);
  if (!fs.existsSync(workerAuthFile)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(workerAuthFile, 'utf8'));
    const tokenEntry = raw?.origins?.[0]?.localStorage?.find((item: any) => item.name === 'token');
    if (tokenEntry?.value) {
      workerTokenCache.set(workerId, tokenEntry.value);
      return tokenEntry.value;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

interface WorkerBrowserPool {
  context: BrowserContext | null;
  page: Page | null;
  dirty: boolean;
  lastWorkerId?: AssignedWorkerId;
  lastBaseURL?: string;
}

export const test = baseTest.extend<
  {
    assignedWorker: AssignedWorkerId;
    autoReset: void;
  },
  {
    _workerPool: WorkerBrowserPool;
  }
>({
  // Worker-scoped persistent BrowserContext + Page pool to avoid 2s+ renderer spawn per test
  _workerPool: [
    async ({}, use) => {
      const pool: WorkerBrowserPool = {
        context: null,
        page: null,
        dirty: false,
      };
      await use(pool);
      if (pool.context) {
        await pool.context.close().catch(() => {});
      }
      // Clean up any ephemeral dynamic users created by the final test on this worker
      if (pool.lastWorkerId && pool.lastBaseURL) {
        await fetch(`${pool.lastBaseURL}/api/test/reset?worker=${pool.lastWorkerId}`, { method: 'POST' }).catch(() => {});
      }
    },
    { scope: 'worker' },
  ],

  // Deterministic preassigned worker ID (1..5) resolved from test file path
  assignedWorker: async ({ _workerPool }, use, testInfo) => {
    const workerId = resolveAssignedWorker(testInfo.file);
    _workerPool.lastWorkerId = workerId;
    process.env.ASSIGNED_WORKER_INDEX = String(workerId);
    await use(workerId);
  },

  context: async ({ browser, baseURL, _workerPool, storageState }, use, testInfo) => {
    const workerId = resolveAssignedWorker(testInfo.file);
    process.env.ASSIGNED_WORKER_INDEX = String(workerId);

    // Check directly whether the suite requested an unauthenticated state via `test.use({ storageState: { cookies: [], origins: [] } })`
    const isExplicitlyUnauthenticated =
      typeof storageState === 'object' &&
      storageState !== null &&
      (!('origins' in storageState) || !storageState.origins || storageState.origins.length === 0);

    const isVisual = testInfo.file.replace(/\\/g, '/').includes('/visual/');
    if (isVisual && !(_workerPool as any)._inVisualSuite) {
      _workerPool.dirty = true;
      (_workerPool as any)._inVisualSuite = true;
    } else if (!isVisual && (_workerPool as any)._inVisualSuite) {
      (_workerPool as any)._inVisualSuite = false;
    }

    // Create or recreate the worker's reusable context + page if needed
    if (!_workerPool.context || !_workerPool.page || _workerPool.dirty || _workerPool.page.isClosed()) {
      if (_workerPool.context) {
        await _workerPool.context.close().catch(() => {});
      }
      const ctx = await browser.newContext({ baseURL });
      const pg = await ctx.newPage();

      // Track if a test registers a permanent addInitScript so the next test gets a clean context
      const origCtxInit = ctx.addInitScript.bind(ctx);
      ctx.addInitScript = (async (...args: Parameters<BrowserContext['addInitScript']>) => {
        _workerPool.dirty = true;
        return origCtxInit(...args);
      }) as BrowserContext['addInitScript'];

      const origPgInit = pg.addInitScript.bind(pg);
      pg.addInitScript = (async (...args: Parameters<Page['addInitScript']>) => {
        _workerPool.dirty = true;
        return origPgInit(...args);
      }) as Page['addInitScript'];

      _workerPool.context = ctx;
      _workerPool.page = pg;
      _workerPool.dirty = false;
    }

    const ctx = _workerPool.context;
    const pg = _workerPool.page;

    // Close any secondary tabs opened during a multi-tab test
    const allPages = ctx.pages();
    for (let i = 1; i < allPages.length; i++) {
      await allPages[i].close().catch(() => {});
    }

    // Clear all route interceptors from previous test
    await pg.unrouteAll({ behavior: 'ignoreErrors' });
    await ctx.unrouteAll({ behavior: 'ignoreErrors' });

    // Register fast blank page route on same origin to unmount previous Angular app & reset storage in ~3ms
    await ctx.route('**/__test_blank__', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>',
      })
    );

    // For non-visual tests, fulfill external Google Fonts in 0ms to eliminate internet latency
    if (!testInfo.file.replace(/\\/g, '/').includes('/visual/')) {
      await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'text/css',
          headers: { 'Cache-Control': 'no-store' },
          body: '',
        })
      );
    }

    // Reset viewport to standard desktop dimensions if altered by a responsiveness test
    const currentVp = pg.viewportSize();
    if (!currentVp || currentVp.width !== 1280 || currentVp.height !== 720) {
      await pg.setViewportSize({ width: 1280, height: 720 });
    }

    // Clear cookies and reset origin localStorage/sessionStorage
    await ctx.clearCookies();
    await pg.goto('/__test_blank__');

    const desiredToken = isExplicitlyUnauthenticated ? null : getWorkerToken(workerId);
    if (!isExplicitlyUnauthenticated && !desiredToken) {
      throw new Error(`Worker ${workerId} auth state is missing or empty. Please ensure auth.setup runs before worker tests.`);
    }
    await pg.evaluate((jwt: string | null) => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
        if (jwt) {
          window.localStorage.setItem('token', jwt);
        }
      } catch {}
    }, desiredToken);

    await use(ctx);
  },

  page: async ({ context: _ctx, _workerPool }, use) => {
    await use(_workerPool.page!);
  },

  autoReset: [
    async ({ request, baseURL, _workerPool }, use, testInfo) => {
      const workerId = resolveAssignedWorker(testInfo.file);
      _workerPool.lastWorkerId = workerId;
      _workerPool.lastBaseURL = baseURL || process.env.BASE_URL || 'http://localhost:3100';
      process.env.ASSIGNED_WORKER_INDEX = String(workerId);

      // 1. Trigger deterministic database wipe and baseline re-seed for THIS PREASSIGNED WORKER ONLY
      const res = await request.post(`/api/test/reset?worker=${workerId}`);

      // 2. Defensive check: Fail immediately if the test reset endpoint is unreachable
      if (!res.ok()) {
        const text = await res.text();
        throw new Error(
          `Auto-reset failed on preassigned Worker ${workerId} with status ${res.status()}: ${text}. Is the server booted in NODE_ENV=test?`
        );
      }

      // 3. Verify that the response includes reset_complete status
      const data = await res.json();
      expect(data.status).toBe('reset_complete');

      // 4. Yield execution to the test function
      await use();
    },
    // { auto: true } ensures this fixture executes before every single test without manual invocation
    { auto: true },
  ],
});

// Re-export standard expect for convenient single-import consumption
export { expect };
