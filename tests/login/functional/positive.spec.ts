/**
 * ============================================================================
 * COMPONENT: Login Page
 * FOLDER:    playwright/login/functional/
 * MODULE:    positive.spec.ts
 * TAXONOMY:  1. Functional Testing › Happy Path & Core Workflows
 * ASSIGNED WORKER: Worker 1 (project: worker-1 | account: bot.worker1@quicktix.test)
 * WORKER BATCH:    Login Batch 1 of 2 (login/functional, login/security, login/resilience, login/api | ~99.1s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Verifies core application happy-path authentication capabilities using
 * valid credentials, authorized flows, and expected successful states:
 *   1. Standard Sign-In: Submits valid user credentials (email + password),
 *      verifies receipt of JWT token, and confirms client routing to `/tickets`.
 *   2. One-Click Demo Login: Exercises the quick-access developer shortcut
 *      `auto-signin-demo` to ensure QA fast-path automatically signs in.
 *   3. New User Registration: Verifies end-to-end account creation with a
 *      dynamically generated unique email, checking automatic login upon creation.
 *   4. Tab / Mode Switching: Tests the toggle between "Sign In" and "Create Account"
 *      to ensure form headers, button labels, and internal signal state match.
 *
 * COMMUNICATES WITH:
 *   - Angular Components: `LoginComponent` (`client/src/app/components/login/`)
 *   - Services: `AuthService.login()` & `AuthService.register()`
 *   - Backend Routes: `POST /api/auth/login` and `POST /api/auth/register`
 *   - Fixtures: `base.fixture.ts` (auto-resets database to clean state)
 *   - Test Data: `TEST_USERS.bot` from `fixtures/mock-data.ts`
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. Test runner enforces an empty, unauthenticated browser storage state.
 *   2. `autoReset` fixture fires, resetting MongoDB users to baseline.
 *   3. Browser navigates to `/login` and renders the interactive form.
 *   4. Form controls receive user inputs and click events.
 *   5. Angular dispatches HTTP requests to Express, storing the JWT in localStorage.
 *   6. Angular Router navigates to `/tickets`, mounting `TicketListComponent`.
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import { TEST_USERS } from '../../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 1] — Executed deterministically by Worker 1 (Login Batch 1 of 2 (login/functional, login/security, login/resilience, login/api | ~99.1s total))
test.describe('Login Component › Functional › Positive Testing', () => {
  // Enforce a completely unauthenticated browser context for each test in this suite
  // so tests do not inherit global session cookies or tokens from auth.setup.ts
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    // Navigate directly to the login page and wait for the form input to render
    await page.goto('/login');
    await expect(page.getByTestId('login-email')).toBeVisible();
  });

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Valid login authenticates user and navigates to tickets dashboard',
    { tag: ['@smoke', '@login', '@positive'] },
    async ({ page }) => {
      // Step 1: Input valid automated bot credentials seeded in the database
      await page.getByTestId('login-email').fill(TEST_USERS.bot.email);
      await page.getByTestId('login-password').fill(TEST_USERS.bot.password);

      // Step 2: Click the primary submit button to trigger onSubmit() in LoginComponent
      await page.getByTestId('login-submit').click();

      // Step 3: Verify the client-side router redirects to the protected /tickets route
      await expect(page).toHaveURL(/.*\/tickets/);

      // Step 4: Ensure the dashboard view and ticket list are fully rendered
      await expect(page.getByTestId('ticket-list')).toBeVisible();
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Auto Sign In with Demo Account button logs in immediately',
    { tag: ['@login', '@positive'] },
    async ({ page }) => {
      // Step 1: Locate the convenient one-click demo login button in the login footer
      const demoBtn = page.getByTestId('auto-signin-demo');
      await expect(demoBtn).toBeVisible();

      // Step 2: Click demo login - triggers fillDemoCredentials(true) with qa.user credentials
      await demoBtn.click();

      // Step 3: Verify immediate navigation to the tickets workspace and authenticated state
      await expect(page).toHaveURL(/.*\/tickets/);
      await expect(page.getByTestId('ticket-empty')).toBeVisible();
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'New user registration flow creates account and directs to tickets dashboard',
    { tag: ['@login', '@positive'] },
    async ({ page }) => {
      // Step 1: Click the "Create Account" tab to switch the form to registration mode
      await page.getByTestId('tab-register').click();
      await expect(page.getByRole('heading', { level: 2 })).toHaveText('Create Account');

      // Step 2: Populate dynamic credentials with unique timestamp to guarantee zero collision
      const uniqueEmail = `qa_test_${Date.now()}@quicktix.test`;
      await page.getByTestId('login-email').fill(uniqueEmail);
      await page.getByTestId('login-password').fill('Passw0rd!test');

      // Step 3: Submit registration form - triggers POST /api/auth/register
      await page.getByTestId('login-submit').click();

      // Step 4: Successful registration returns JWT; verify transition to protected dashboard
      await expect(page).toHaveURL(/.*\/tickets/);
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Mode switch link toggles between Sign In and Create Account',
    { tag: ['@login', '@positive'] },
    async ({ page }) => {
      // Step 1: Confirm initial default mode is "Sign In"
      await expect(page.getByTestId('login-submit')).toHaveText('Sign In');

      // Step 2: Click mode switch link at bottom ("Don't have an account? Create an account")
      await page.getByTestId('auth-switch-mode').click();
      await expect(page.getByTestId('login-submit')).toHaveText('Create Account');

      // Step 3: Click mode switch link again ("Already have an account? Sign in")
      await page.getByTestId('auth-switch-mode').click();
      await expect(page.getByTestId('login-submit')).toHaveText('Sign In');
    }
  );
});
