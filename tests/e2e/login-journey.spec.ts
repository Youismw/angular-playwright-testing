/**
 * ============================================================================
 * COMPONENT: Login Page
 * FOLDER:    playwright/login/e2e/
 * MODULE:    login-journey.spec.ts
 * TAXONOMY:  4. End-to-End (E2E) Testing › Authentication & Session Lifecycle Journey
 * ASSIGNED WORKER: Worker 5 (project: worker-5 | account: bot.worker5@quicktix.test)
 * WORKER BATCH:    E2E & Unassigned Catch-All Batch (e2e/* + any unassigned tests | ~37.3s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * End-to-end authentication journey covering registration, demo login, session
 * persistence across reloads, sign-out teardown, and re-authentication:
 *   1. Register -> Verify empty dashboard -> Sign Out.
 *   2. One-click Demo Login (`auto-signin-demo`) -> Reload page -> Verify session persists -> Sign Out.
 *   3. Standard Credentials Login (`TEST_USERS.bot`) -> Verify seeded tickets load.
 * ============================================================================
 */

import { test, expect } from '../fixtures/base.fixture.js';
import { TEST_USERS } from '../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 5] — Executed deterministically by Worker 5 (E2E & Unassigned Catch-All Batch (e2e/* + any unassigned tests | ~37.3s total))
test.describe('Login Component › E2E › Full Authentication & Session Lifecycle', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // [Worker 5] Executed on preassigned Worker 5 (bot.worker5@quicktix.test)
  test(
    'End-to-End Auth Journey: Self-Service Registration -> Logout -> Demo Fast-Path Login -> Reload Persistence -> Logout -> Bot Login',
    { tag: ['@e2e', '@journey', '@login'] },
    async ({ page }) => {
      // Phase 1: Register a new user and verify immediate authenticated session
      await page.goto('/register');
      const newEmail = `login_e2e_${Date.now()}@quicktix.test`;
      await page.getByTestId('login-email').fill(newEmail);
      await page.getByTestId('login-password').fill('Passw0rd!E2E');
      await page.getByTestId('login-submit').click();

      await expect(page).toHaveURL(/.*\/tickets/);
      await expect(page.locator('app-header')).toContainText(newEmail);
      await expect(page.getByTestId('ticket-empty')).toBeVisible();

      // Sign out back to /login
      await page.getByRole('button', { name: /sign out/i }).click();
      await expect(page).toHaveURL(/.*\/login/);

      // Phase 2: One-click Demo Login and page reload persistence check
      await page.getByTestId('auto-signin-demo').click();
      await expect(page).toHaveURL(/.*\/tickets/);
      await expect(page.locator('app-header')).toContainText(TEST_USERS.dev.email);

      await page.reload();
      await expect(page).toHaveURL(/.*\/tickets/);
      await expect(page.locator('app-header')).toContainText(TEST_USERS.dev.email);

      // Sign out and log in as Worker Bot
      await page.getByRole('button', { name: /sign out/i }).click();
      await expect(page).toHaveURL(/.*\/login/);

      await page.goto('/login');
      await page.getByTestId('login-email').fill(TEST_USERS.bot.email);
      await page.getByTestId('login-password').fill(TEST_USERS.bot.password);
      await page.getByTestId('login-submit').click();

      await expect(page).toHaveURL(/.*\/tickets/);
      await expect(page.getByTestId('ticket-row')).toHaveCount(4);
    }
  );
});

