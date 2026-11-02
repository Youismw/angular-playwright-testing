/**
 * ============================================================================
 * COMPONENT: Tickets Feature
 * FOLDER:    playwright/tickets/ui-browser/
 * MODULE:    navigation.spec.ts
 * TAXONOMY:  2. UI & Browser Testing › Navigation, Header State & Session Routing
 * ASSIGNED WORKER: Worker 4 (project: worker-4 | account: bot.worker4@quicktix.test)
 * WORKER BATCH:    Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Tests routing transitions, header state preservation, and browser history:
 *   1. Authenticated Header Branding: Asserts navbar renders "QUICKTIX", the
 *      "CORE TRACKER" badge, user email label, and the "Sign Out" button.
 *   2. Sign Out Flow: Clicks "Sign Out", asserting token is cleared from localStorage
 *      and browser navigates to `/login`.
 *   3. Post-Logout History Security: After logging out, pressing the browser's
 *      Back button is intercepted by AuthGuard, keeping the user securely on `/login`.
 *   4. Modal History Independence: Opening and closing create/confirm modals does
 *      not dirty or mutate browser history URL.
 *
 * COMMUNICATES WITH:
 *   - Components: `HeaderComponent`, `TicketListComponent`
 *   - Client Services: `AuthService.logout()`
 *   - Angular Router & AuthGuard
 *   - Fixtures: `base.fixture.ts`
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';

// [ASSIGNED WORKER: Worker 4] — Executed deterministically by Worker 4 (Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total))
test.describe('Tickets Feature › UI & Browser › Navigation & Header State', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tickets');
    await expect(page.getByTestId('ticket-list')).toBeVisible();
  });

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Dashboard navbar renders branding, badge, user email, and sign out button',
    { tag: ['@tickets', '@navigation'] },
    async ({ page }) => {
      // Step 1: Verify brand title and badge in navbar
      await expect(page.locator('.brand-name')).toHaveText('QUICKTIX');
      await expect(page.locator('.brand-badge')).toHaveText('CORE TRACKER');

      // Step 2: Verify user email is visible in header
      const userLabel = page.locator('.nav-user-label');
      await expect(userLabel).toBeVisible();
      await expect(userLabel).toContainText('@');

      // Step 3: Verify Sign Out button is present
      const signOutBtn = page.getByRole('button', { name: /sign out/i });
      await expect(signOutBtn).toBeVisible();
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Clicking Sign Out clears token and redirects to login view',
    { tag: ['@smoke', '@tickets', '@navigation'] },
    async ({ page }) => {
      // Step 1: Click Sign Out
      await page.getByRole('button', { name: /sign out/i }).click();

      // Step 2: Assert navigation to /login
      await expect(page).toHaveURL(/.*\/login/);
      await expect(page.getByTestId('login-email')).toBeVisible();

      // Step 3: Assert localStorage token has been destroyed
      const token = await page.evaluate(() => window.localStorage.getItem('token'));
      expect(token).toBeNull();
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Browser back button after sign out prevents returning to protected tickets dashboard',
    { tag: ['@tickets', '@navigation'] },
    async ({ page }) => {
      // Step 1: Sign out
      await page.getByRole('button', { name: /sign out/i }).click();
      await expect(page).toHaveURL(/.*\/login/);

      // Step 2: Attempt browser Back navigation
      await page.goBack();

      // Step 3: Assert AuthGuard intercepts and forces back to /login
      await expect(page).toHaveURL(/.*\/login/);
      await expect(page.getByTestId('login-email')).toBeVisible();
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Opening and dismissing create modal does not alter URL or trigger page reload',
    { tag: ['@tickets', '@navigation'] },
    async ({ page }) => {
      const initialUrl = page.url();

      // Open modal
      await page.getByTestId('ticket-new').click();
      await expect(page.getByTestId('ticket-form')).toBeVisible();
      expect(page.url()).toBe(initialUrl);

      // Close modal
      await page.getByRole('button', { name: /cancel/i }).click();
      await expect(page.getByTestId('ticket-form')).toBeHidden();
      expect(page.url()).toBe(initialUrl);
    }
  );
});
