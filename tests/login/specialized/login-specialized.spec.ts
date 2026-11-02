/**
 * ============================================================================
 * COMPONENT: Login Page
 * FOLDER:    playwright/login/specialized/
 * MODULE:    login-specialized.spec.ts
 * TAXONOMY:  8. Specialized Testing › Metadata, SEO, SPA Cache-Control & Console Hygiene
 * ASSIGNED WORKER: Worker 2 (project: worker-2 | account: bot.worker2@quicktix.test)
 * WORKER BATCH:    Login Batch 2 of 2 (login/ui-browser, login/specialized, login/visual, login/mutation, login/performance | ~100.1s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Validates specialized browser, document metadata, and HTTP caching invariants:
 *   1. Document Metadata & SEO Tags: Asserts `<title>`, `<html lang="en">`,
 *      `<meta charset="utf-8">`, `<meta name="viewport">`, and `<base href="/">`.
 *   2. Favicon Asset Delivery: Verifies `/favicon.ico` returns HTTP 200 with a
 *      non-empty icon binary payload.
 *   3. Express 5 SPA Fallback & Cache-Control Contract (CONTRACT.md §6):
 *      Confirms client route requests (`/login`, `/register`) return `index.html`
 *      with `Cache-Control: no-cache, no-store, must-revalidate`.
 *   4. Zero Console Errors & Uncaught Page Exceptions Gate:
 *      Monitors `page.on('console')` and `page.on('pageerror')` across login
 *      and registration mode transitions.
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import { TEST_USERS } from '../../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 2] — Executed deterministically by Worker 2 (Login Batch 2 of 2 (login/ui-browser, login/specialized, login/visual, login/mutation, login/performance | ~100.1s total))
test.describe('Login Component › Specialized › Metadata, SEO & SPA Fallback Contracts', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Document head exposes compliant HTML5 lang, title, charset, viewport, and base href metadata',
    { tag: ['@specialized', '@seo', '@login'] },
    async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByTestId('login-email')).toBeVisible();

      // 1. Page title
      await expect(page).toHaveTitle(/QuickTix/i);

      // 2. HTML lang="en" attribute
      const htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBe('en');

      // 3. Meta viewport tag
      const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewportMeta).toContain('width=device-width');
      expect(viewportMeta).toContain('initial-scale=1');

      // 4. Meta charset UTF-8
      const charsetCount = await page.locator('meta[charset="utf-8"], meta[charset="UTF-8"]').count();
      expect(charsetCount).toBe(1);

      // 5. Base href
      const baseHref = await page.locator('base').getAttribute('href');
      expect(baseHref).toBe('/');
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'GET /favicon.ico serves valid icon asset with HTTP 200',
    { tag: ['@specialized', '@login'] },
    async ({ request }) => {
      const res = await request.get('/favicon.ico');
      expect(res.status()).toBe(200);
      const body = await res.body();
      expect(body.byteLength).toBeGreaterThan(0);
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'SPA client routes (/login, /register) enforce Cache-Control: no-cache, no-store, must-revalidate per CONTRACT.md §6',
    { tag: ['@specialized', '@contract', '@login'] },
    async ({ request }) => {
      for (const spaPath of ['/login', '/register']) {
        const res = await request.get(spaPath, {
          headers: { Accept: 'text/html' },
        });
        expect(res.status()).toBe(200);
        expect(res.headers()['content-type']).toContain('text/html');
        expect(res.headers()['cache-control']).toBe('no-cache, no-store, must-revalidate');
      }
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Login and Register UI interactions emit zero console.error logs or uncaught page exceptions',
    { tag: ['@specialized', '@login'] },
    async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      page.on('pageerror', (err) => {
        pageErrors.push(err.message);
      });

      await page.goto('/login');
      await expect(page.getByTestId('login-email')).toBeVisible();

      // Switch modes and type into inputs
      await page.getByTestId('tab-register').click();
      await page.getByTestId('login-email').fill('clean_console@quicktix.test');
      await page.getByTestId('tab-login').click();

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'AuthService activity tracker records auth_last_activity timestamp in localStorage on user interaction and purges on logout',
    { tag: ['@specialized', '@login'] },
    async ({ page }) => {
      await page.goto('/login');
      await page.getByTestId('login-email').fill(TEST_USERS.bot.email);
      await page.getByTestId('login-password').fill(TEST_USERS.bot.password);
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL(/.*\/tickets/);

      // Wait > 1000ms throttle window, then dispatch user interaction (mousedown/keydown)
      await page.waitForTimeout(1050);
      await page.mouse.click(100, 100);

      const lastActivity = await page.evaluate(() => window.localStorage.getItem('auth_last_activity'));
      expect(lastActivity).toBeTruthy();
      expect(Number(lastActivity)).toBeGreaterThan(0);

      // Sign out and verify auth_last_activity is purged alongside token
      await page.getByRole('button', { name: /sign out/i }).click();
      await expect(page).toHaveURL(/.*\/login/);

      const activityAfterLogout = await page.evaluate(() => window.localStorage.getItem('auth_last_activity'));
      expect(activityAfterLogout).toBeNull();
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'AuthService enforces 15-second expiration leeway on guard check and scheduleAutoLogout timer on active session',
    { tag: ['@specialized', '@security', '@login'] },
    async ({ page }) => {
      // Part A: Token expiring in 10 seconds (within 15s leeway) is treated as already expired by isTokenExpired()
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const leewayExp = Math.floor(Date.now() / 1000) + 10;
      const leewayPayload = Buffer.from(
        JSON.stringify({ id: TEST_USERS.bot.id, email: TEST_USERS.bot.email, exp: leewayExp })
      ).toString('base64url');
      const nearExpiryToken = `${header}.${leewayPayload}.sig`;

      await page.goto('/login');
      await page.evaluate((t) => window.localStorage.setItem('token', t), nearExpiryToken);
      await page.goto('/tickets');

      // AuthGuard + isTokenExpired() rejects the <15s token and redirects to /login
      await expect(page).toHaveURL(/.*\/login/);
      const purgedToken = await page.evaluate(() => window.localStorage.getItem('token'));
      expect(purgedToken).toBeNull();

      // Part B: Log in normally, then trigger scheduleAutoLogout via a token expiring in 1 second
      await page.getByTestId('login-email').fill(TEST_USERS.bot.email);
      await page.getByTestId('login-password').fill(TEST_USERS.bot.password);
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL(/.*\/tickets/);

      const shortExp = Math.floor(Date.now() / 1000) + 1;
      const shortPayload = Buffer.from(
        JSON.stringify({ id: TEST_USERS.bot.id, email: TEST_USERS.bot.email, exp: shortExp })
      ).toString('base64url');
      const oneSecToken = `${header}.${shortPayload}.sig`;

      await page.evaluate((t) => {
        window.localStorage.setItem('token', t);
        window.dispatchEvent(new StorageEvent('storage', { key: 'token', newValue: t }));
      }, oneSecToken);

      // scheduleAutoLogout fires after ~1s and automatically redirects to /login
      await expect(page).toHaveURL(/.*\/login/, { timeout: 4000 });
    }
  );
});

