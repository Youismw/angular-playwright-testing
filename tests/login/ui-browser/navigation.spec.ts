/**
 * ============================================================================
 * COMPONENT: Login Page
 * FOLDER:    playwright/login/ui-browser/
 * MODULE:    navigation.spec.ts
 * TAXONOMY:  2. UI & Browser Testing › Navigation, Header State & Routing
 * ASSIGNED WORKER: Worker 2 (project: worker-2 | account: bot.worker2@quicktix.test)
 * WORKER BATCH:    Login Batch 2 of 2 (login/ui-browser, login/specialized, login/visual, login/mutation, login/performance | ~100.1s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Tests routing transitions, header branding states, and browser history:
 *   1. Header State Isolation: Confirms the login page header shows brand elements
 *      (QuickTix, Architectural Edition badge) but hides authenticated actions
 *      (like "+ New Ticket" and "Sign Out").
 *   2. View Transitions: Tests smooth UI updates when switching between tabs without
 *      causing full browser refreshes.
 *   3. Browser Back Button Session Integrity: Verifies that pressing the browser's
 *      Back button after logging in keeps the session safe and prevents returning
 *      to an unauthenticated state.
 *
 * COMMUNICATES WITH:
 *   - Components: `HeaderComponent` (`client/src/app/components/header/header.component.ts`)
 *   - Client Router: `@angular/router` navigation and browser history API (`page.goBack()`)
 *   - Route Guard: `AuthGuard`
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. User visits `/login`.
 *   2. Header renders in "login" variant with `[showUserActions]="false"`.
 *   3. User performs actions and transitions routes.
 *   4. Angular router synchronizes view and manages history stack cleanly.
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import { TEST_USERS } from '../../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 2] — Executed deterministically by Worker 2 (Login Batch 2 of 2 (login/ui-browser, login/specialized, login/visual, login/mutation, login/performance | ~100.1s total))
test.describe('Login Component › UI & Browser › Navigation & Routing', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-email')).toBeVisible();
  });

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Login header renders branding and hides authenticated user actions',
    { tag: ['@login', '@navigation'] },
    async ({ page }) => {
      // Step 1: Assert app header component is mounted
      const header = page.locator('app-header');
      await expect(header).toBeVisible();

      // Step 2: Confirm brand title and architectural edition badge are visible
      await expect(page.locator('.brand-title')).toContainText(/quicktix/i);
      await expect(page.getByText('ARCHITECTURAL EDITION')).toBeVisible();

      // Step 3: Confirm authenticated controls are hidden on the unauthenticated login view
      await expect(page.getByTestId('ticket-new')).toBeHidden();
      await expect(page.getByRole('button', { name: /logout|sign out/i })).toBeHidden();
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Switching between tabs transitions text smoothly without page reload',
    { tag: ['@login', '@navigation'] },
    async ({ page }) => {
      const heading = page.getByRole('heading', { level: 2 });
      const description = page.locator('.card-description');
      const submitBtn = page.getByTestId('login-submit');

      // Step 1: Verify initial Sign In text and description
      await expect(heading).toHaveText('Sign In');
      await expect(description).toContainText(/access your engineering ticket stream/i);
      await expect(submitBtn).toHaveText('Sign In');

      // Step 2: Click Create Account tab and verify title and description adapt
      await page.getByTestId('tab-register').click();
      await expect(heading).toHaveText('Create Account');
      await expect(description).toContainText(/set up your personal ticket workspace/i);
      await expect(submitBtn).toHaveText('Create Account');

      // Step 3: Switch back to Sign In and verify clean restoration
      await page.getByTestId('tab-login').click();
      await expect(heading).toHaveText('Sign In');
      await expect(submitBtn).toHaveText('Sign In');
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Browser back button preserves protected session after logging in',
    { tag: ['@login', '@navigation'] },
    async ({ page }) => {
      // Step 1: Complete sign in using standard form input
      await page.getByTestId('login-email').fill(TEST_USERS.bot.email);
      await page.getByTestId('login-password').fill(TEST_USERS.bot.password);
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL(/.*\/tickets/);
      await expect(page.locator('app-header')).toContainText(TEST_USERS.bot.email);
      await expect(page.getByTestId('ticket-list')).toBeVisible();

      // Step 2: Simulate pressing the browser's native Back button
      await page.goBack();

      // Step 3: Angular AuthGuard / LoginComponent.ngOnInit intercepts active session and redirects back to /tickets
      await expect(page).toHaveURL(/.*\/tickets/);
      await expect(page.locator('app-header')).toContainText(TEST_USERS.bot.email);
      await expect(page.getByTestId('ticket-list')).toBeVisible();
    }
  );
});
