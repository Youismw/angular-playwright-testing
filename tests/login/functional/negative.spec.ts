/**
 * ============================================================================
 * COMPONENT: Login Page
 * FOLDER:    playwright/login/functional/
 * MODULE:    negative.spec.ts
 * TAXONOMY:  1. Functional Testing › Negative Testing & Failure Scenarios
 * ASSIGNED WORKER: Worker 1 (project: worker-1 | account: bot.worker1@quicktix.test)
 * WORKER BATCH:    Login Batch 1 of 2 (login/functional, login/security, login/resilience, login/api | ~99.1s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Tests the system's ability to reject invalid inputs, unauthorized actions,
 * and malicious/unexpected user attempts:
 *   1. Invalid Password: Valid registered email with bad password displays
 *      an inline `[data-testid="login-error"]` alert with role="alert".
 *   2. Non-Existent User: Submitting an unregistered email address displays
 *      a generic authentication failure without leaking account existence.
 *   3. Duplicate Registration: Submitting an email that already exists triggers
 *      a conflict error (HTTP 409) preventing duplicate accounts.
 *   4. Unauthenticated Route Access: Direct URL navigation to `/tickets`
 *      is intercepted by Angular's AuthGuard and forced back to `/login`.
 *
 * COMMUNICATES WITH:
 *   - Client Guard: `AuthGuard` in `client/src/app/guards/auth.guard.ts`
 *   - Components: `LoginComponent` alert banner (`login-error`)
 *   - Backend Routes: `POST /api/auth/login` (returns HTTP 401 Unauthorized)
 *   - Backend Routes: `POST /api/auth/register` (returns HTTP 409 Conflict)
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. Browser visits `/login` with an unauthenticated context.
 *   2. Bad credentials or duplicate registration data is submitted.
 *   3. Express backend executes bcrypt checks and rejects with 401 or 409.
 *   4. Angular's `errorMessage` signal updates reactively.
 *   5. Template renders `<div data-testid="login-error" role="alert">` to inform user.
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import { TEST_USERS } from '../../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 1] — Executed deterministically by Worker 1 (Login Batch 1 of 2 (login/functional, login/security, login/resilience, login/api | ~99.1s total))
test.describe('Login Component › Functional › Negative Testing', () => {
  // Enforce a logged-out browser context so tests evaluate raw authentication barriers
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-email')).toBeVisible();
  });

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Bad credentials show login-error alert',
    { tag: ['@login', '@negative'] },
    async ({ page }) => {
      // Step 1: Submit a valid registered email address but an incorrect password
      await page.getByTestId('login-email').fill(TEST_USERS.bot.email);
      await page.getByTestId('login-password').fill('CompletelyWrongPassword123!');
      await page.getByTestId('login-submit').click();

      // Step 2: Assert error alert renders in DOM, has role="alert", and informs the user
      const errorAlert = page.getByTestId('login-error');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toHaveAttribute('role', 'alert');
      await expect(errorAlert).toContainText(/invalid email or password/i);

      // Step 3: Verify the browser remains securely on /login and did not navigate
      await expect(page).toHaveURL(/.*\/login/);
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Non-existent user email displays authentication failure',
    { tag: ['@login', '@negative'] },
    async ({ page }) => {
      // Step 1: Submit an unregistered email address with a dummy password
      await page.getByTestId('login-email').fill(`nonexistent_${Date.now()}@quicktix.test`);
      await page.getByTestId('login-password').fill('SomePassword123!');
      await page.getByTestId('login-submit').click();

      // Step 2: Assert generic error alert renders without leaking account existence details
      const errorAlert = page.getByTestId('login-error');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toContainText(/invalid email or password/i);
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Registration with existing email displays conflict error',
    { tag: ['@login', '@negative'] },
    async ({ page }) => {
      // Step 1: Switch to registration mode
      await page.getByTestId('tab-register').click();

      // Step 2: Enter an already seeded user's email address
      await page.getByTestId('login-email').fill(TEST_USERS.dev.email);
      await page.getByTestId('login-password').fill('Passw0rd!test');
      await page.getByTestId('login-submit').click();

      // Step 3: Assert HTTP 409 conflict notification appears in the error banner
      const errorAlert = page.getByTestId('login-error');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toContainText(/already exists/i);
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Unauthenticated navigation to /tickets is prevented and redirects to /login',
    { tag: ['@smoke', '@login', '@negative'] },
    async ({ page }) => {
      // Step 1: Attempt direct deep-link access to protected route /tickets without auth token
      await page.goto('/tickets');

      // Step 2: Auth guard intercepts navigation and forces redirect back to /login
      await expect(page).toHaveURL(/.*\/login/);
      await expect(page.getByTestId('login-email')).toBeVisible();
    }
  );
});
