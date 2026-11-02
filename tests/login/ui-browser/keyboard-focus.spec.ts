/**
 * ============================================================================
 * COMPONENT: Login Page
 * FOLDER:    playwright/login/ui-browser/
 * MODULE:    keyboard-focus.spec.ts
 * TAXONOMY:  2. UI & Browser Testing › Keyboard Navigation & Focus Behavior
 * ASSIGNED WORKER: Worker 2 (project: worker-2 | account: bot.worker2@quicktix.test)
 * WORKER BATCH:    Login Batch 2 of 2 (login/ui-browser, login/specialized, login/visual, login/mutation, login/performance | ~100.1s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Validates full keyboard operability, logical focus transitions, and key listeners:
 *   1. Sequential Tab Order: Verifies user can navigate through all interactive
 *      elements (tabs -> inputs -> buttons) using only the Tab key.
 *   2. Shift+Tab Reverse: Verifies Shift+Tab reverses focus sequentially.
 *   3. Enter Key Submission: Confirms pressing Enter inside form inputs triggers
 *      submission without requiring mouse clicks.
 *
 * COMMUNICATES WITH:
 *   - Playwright Keyboard Dispatcher: `page.keyboard.press()`
 *   - DOM Focus Management: `expect(locator).toBeFocused()`
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. Visitor navigates using keyboard only.
 *   2. Browser dispatches sequential Tab key events.
 *   3. DOM activeElement shifts logically from top to bottom.
 *   4. Form submits successfully upon pressing Enter.
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';

// [ASSIGNED WORKER: Worker 2] — Executed deterministically by Worker 2 (Login Batch 2 of 2 (login/ui-browser, login/specialized, login/visual, login/mutation, login/performance | ~100.1s total))
test.describe('Login Component › UI & Browser › Keyboard & Focus Behavior', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-email')).toBeVisible();
  });

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Tab key traverses interactive elements in logical order',
    { tag: ['@login', '@keyboard'] },
    async ({ page }) => {
      // Step 1: Focus first tab button ("Sign In")
      await page.getByTestId('tab-login').focus();
      await expect(page.getByTestId('tab-login')).toBeFocused();

      // Step 2: Tab to second tab ("Create Account")
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('tab-register')).toBeFocused();

      // Step 3: Tab to Email input field
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('login-email')).toBeFocused();

      // Step 4: Tab to Password input field
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('login-password')).toBeFocused();

      // Step 5: Tab to primary Submit button
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('login-submit')).toBeFocused();

      // Step 6: Tab to Mode switch button link
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('auth-switch-mode')).toBeFocused();

      // Step 7: Tab to Demo auto sign-in shortcut button
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('auto-signin-demo')).toBeFocused();
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Shift+Tab moves focus in reverse direction',
    { tag: ['@login', '@keyboard'] },
    async ({ page }) => {
      // Step 1: Place active focus on the password input field
      await page.getByTestId('login-password').focus();
      await expect(page.getByTestId('login-password')).toBeFocused();

      // Step 2: Press Shift+Tab to jump focus backward into the email input field
      await page.keyboard.press('Shift+Tab');
      await expect(page.getByTestId('login-email')).toBeFocused();
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Pressing Enter inside password field triggers form submission',
    { tag: ['@login', '@keyboard'] },
    async ({ page }) => {
      // Step 1: Type invalid credentials via keyboard
      await page.getByTestId('login-email').fill('wrong.email@quicktix.test');
      await page.getByTestId('login-password').fill('WrongPassword123');

      // Step 2: Press Enter while active focus remains in the password input
      await page.keyboard.press('Enter');

      // Step 3: Assert form submission was dispatched and error banner is displayed
      const errorAlert = page.getByTestId('login-error');
      await expect(errorAlert).toBeVisible();
    }
  );
});
