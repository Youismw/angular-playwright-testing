/**
 * ============================================================================
 * COMPONENT: Login Page
 * FOLDER:    playwright/login/functional/
 * MODULE:    error-handling.spec.ts
 * TAXONOMY:  1. Functional Testing › Error Handling, State Recovery & Resilience
 * ASSIGNED WORKER: Worker 1 (project: worker-1 | account: bot.worker1@quicktix.test)
 * WORKER BATCH:    Login Batch 1 of 2 (login/functional, login/security, login/resilience, login/api | ~99.1s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Tests the system's resilience against abnormal states, infrastructure failures,
 * and user state reset / recovery transitions:
 *   1. Error Alert Reset on Tab Change: Verifies that an active error alert is
 *      cleared when switching between Sign In and Create Account modes.
 *   2. Server 500 Graceful Degradation: Simulates a backend 500 error to ensure
 *      the UI catches the failure gracefully and displays a friendly banner.
 *   3. In-Flight Submission Throttling: Confirms the submit button transitions into
 *      a disabled loading state ("Signing In...") during network transmission.
 *   4. Network Failure & Offline Recovery: Simulates an aborted/dropped network
 *      connection to verify clear feedback without an unhandled runtime error.
 *
 * COMMUNICATES WITH:
 *   - Angular Signals: `errorMessage`, `loading`, and `isLoginMode`
 *   - Playwright Network Mocking: `page.route('** /api/auth/login')`
 *   - Components: `LoginComponent` template error alerts and submit button state
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. User triggers an action resulting in an in-flight request or failure.
 *   2. Playwright intercepts the HTTP traffic, simulating network latency or drops.
 *   3. Angular's RxJS error handlers catch HTTP anomalies without page reloads.
 *   4. UI gracefully reflects errors, keeping all input controls interactive for retry.
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import { TEST_USERS } from '../../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 1] — Executed deterministically by Worker 1 (Login Batch 1 of 2 (login/functional, login/security, login/resilience, login/api | ~99.1s total))
test.describe('Login Component › Functional › Error Handling', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-email')).toBeVisible();
  });

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Switching tabs between Sign In and Create Account clears active error alert',
    { tag: ['@login', '@error-handling'] },
    async ({ page }) => {
      // Step 1: Cause an authentication error by submitting invalid credentials
      await page.getByTestId('login-email').fill(TEST_USERS.bot.email);
      await page.getByTestId('login-password').fill('WrongPassword123');
      await page.getByTestId('login-submit').click();

      // Step 2: Confirm error alert is visible in the DOM
      const errorAlert = page.getByTestId('login-error');
      await expect(errorAlert).toBeVisible();

      // Step 3: Switch mode to Create Account
      await page.getByTestId('tab-register').click();

      // Step 4: Assert error alert is automatically dismissed via setMode() signal reset
      await expect(errorAlert).toBeHidden();
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Server HTTP 500 error is handled gracefully with an error banner',
    { tag: ['@login', '@error-handling'] },
    async ({ page }) => {
      // Step 1: Intercept POST /api/auth/login to mock a 500 Internal Server Error
      await page.route('**/api/auth/login', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Database connection dropped' }),
        });
      });

      // Step 2: Submit valid credentials against the failing route
      await page.getByTestId('login-email').fill(TEST_USERS.bot.email);
      await page.getByTestId('login-password').fill(TEST_USERS.bot.password);
      await page.getByTestId('login-submit').click();

      // Step 3: Assert error banner is rendered cleanly without crashing the client UI
      const errorAlert = page.getByTestId('login-error');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toContainText(/database connection dropped|failed to sign in/i);
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Submit button disables and displays loading indicator during in-flight request',
    { tag: ['@login', '@error-handling'] },
    async ({ page }) => {
      // Step 1: Gate login API response on a deferred promise so there is zero fixed sleep delay
      let releaseLogin!: () => void;
      const loginGate = new Promise<void>((resolve) => {
        releaseLogin = resolve;
      });

      await page.route('**/api/auth/login', async (route) => {
        await loginGate;
        await route.continue();
      });

      // Step 2: Enter credentials and click Sign In
      await page.getByTestId('login-email').fill(TEST_USERS.bot.email);
      await page.getByTestId('login-password').fill(TEST_USERS.bot.password);
      await page.getByTestId('login-submit').click();

      // Step 3: While in-flight, verify submit button is disabled and text shows "Signing In..."
      const submitBtn = page.getByTestId('login-submit');
      await expect(submitBtn).toBeDisabled();
      await expect(submitBtn).toContainText(/signing in/i);

      // Step 4: Release gate and verify smooth route navigation to /tickets
      releaseLogin();
      await expect(page).toHaveURL(/.*\/tickets/);
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Network failure displays clear fallback error notification',
    { tag: ['@login', '@error-handling'] },
    async ({ page }) => {
      // Step 1: Abort network request to simulate network disconnect / offline status
      await page.route('**/api/auth/login', async (route) => {
        await route.abort('failed');
      });

      // Step 2: Attempt login during network failure
      await page.getByTestId('login-email').fill(TEST_USERS.bot.email);
      await page.getByTestId('login-password').fill(TEST_USERS.bot.password);
      await page.getByTestId('login-submit').click();

      // Step 3: Verify user gets a visible, friendly fallback error alert
      const errorAlert = page.getByTestId('login-error');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toContainText(/failed to (sign in|fetch)/i);
    }
  );
});
