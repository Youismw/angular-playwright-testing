/**
 * ============================================================================
 * COMPONENT: Login Page
 * FOLDER:    playwright/login/functional/
 * MODULE:    business-logic.spec.ts
 * TAXONOMY:  1. Functional Testing › Business Rules & Session Lifecycle
 * ASSIGNED WORKER: Worker 1 (project: worker-1 | account: bot.worker1@quicktix.test)
 * WORKER BATCH:    Login Batch 1 of 2 (login/functional, login/security, login/resilience, login/api | ~99.1s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Tests domain-specific business rules, session states, and authentication lifecycle:
 *   1. Auto-Redirect on Active Session: An already authenticated visitor attempting
 *      to access `/login` is automatically redirected to `/tickets`.
 *   2. Direct Deep-Linking to `/register`: Direct navigation to `/register`
 *      initializes the view directly in "Create Account" mode.
 *   3. Token Persistence in LocalStorage: Successful authentication persists the JWT
 *      in `window.localStorage['token']`, encoding valid user claims.
 *   4. Session Teardown on Sign Out: Clicking "Sign Out" cleanses `localStorage`
 *      and returns the user to the login view.
 *
 * COMMUNICATES WITH:
 *   - Client Services: `AuthService.isAuthenticated()`, `AuthService.login()`, and `AuthService.logout()`
 *   - Client Router: `@angular/router` navigation guards and route transitions
 *   - Storage: Browser `window.localStorage`
 *   - Backend Routes: `POST /api/auth/login`
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. Test evaluates session boundary conditions (logged-in vs logged-out).
 *   2. Direct deep links or authentication events are performed.
 *   3. Angular's `ngOnInit()` in `LoginComponent` checks `authService.isAuthenticated()`.
 *   4. System executes state routing and asserts browser localStorage state.
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import { TEST_USERS } from '../../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 1] — Executed deterministically by Worker 1 (Login Batch 1 of 2 (login/functional, login/security, login/resilience, login/api | ~99.1s total))
test.describe('Login Component › Functional › Business Logic', () => {
  // Ensure unauthenticated context so /login and /register load without auto-redirecting
  test.use({ storageState: { cookies: [], origins: [] } });

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Already authenticated user visiting /login directly is auto-redirected to /tickets',
    { tag: ['@login', '@business-logic'] },
    async ({ page, request }) => {
      // Step 1: Obtain a valid authentication token directly from the backend API
      const authRes = await request.post('/api/auth/login', {
        data: {
          email: TEST_USERS.bot.email,
          password: TEST_USERS.bot.password,
        },
      });
      const authData = await authRes.json();

      // Step 2: Inject active session token into browser localStorage before page navigation
      await page.evaluate((token) => {
        window.localStorage.setItem('token', token);
      }, authData.token);

      // Step 3: Attempt direct visit to /login while authenticated
      await page.goto('/login');

      // Step 4: Assert LoginComponent.ngOnInit() intercepts and auto-redirects to /tickets
      await expect(page).toHaveURL(/.*\/tickets/);
      await expect(page.getByTestId('ticket-list')).toBeVisible();
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Visiting /register URL directly opens the page in Create Account mode',
    { tag: ['@login', '@business-logic'] },
    async ({ page }) => {
      // Step 1: Visit /register directly in an unauthenticated context
      await page.goto('/register');

      // Step 2: Verify component detected the /register route and initialized in Create Account mode
      const heading = page.getByRole('heading', { level: 2 });
      await expect(heading).toHaveText('Create Account');

      const submitBtn = page.getByTestId('login-submit');
      await expect(submitBtn).toHaveText('Create Account');

      const registerTab = page.getByTestId('tab-register');
      await expect(registerTab).toHaveClass(/active/);
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Successful login persists token and user object into localStorage',
    { tag: ['@login', '@business-logic'] },
    async ({ page }) => {
      // Step 1: Visit login page with an empty session
      await page.goto('/login');

      // Step 2: Complete valid login with bot credentials
      await page.getByTestId('login-email').fill(TEST_USERS.bot.email);
      await page.getByTestId('login-password').fill(TEST_USERS.bot.password);
      await page.getByTestId('login-submit').click();

      // Step 3: Wait for successful transition to dashboard
      await expect(page).toHaveURL(/.*\/tickets/);

      // Step 4: Inspect browser localStorage to confirm token persistence
      const token = await page.evaluate(() => window.localStorage.getItem('token'));
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token!.length).toBeGreaterThan(20);

      // Step 5: Verify the stored JWT token decodes to the authenticated user's email
      const parts = token!.split('.');
      expect(parts).toHaveLength(3);
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      expect(payload.email).toBe(TEST_USERS.bot.email);
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Signing out purges localStorage session data and returns to /login',
    { tag: ['@login', '@business-logic'] },
    async ({ page }) => {
      // Step 1: Establish active session via standard credentials
      await page.goto('/login');
      await page.getByTestId('login-email').fill(TEST_USERS.bot.email);
      await page.getByTestId('login-password').fill(TEST_USERS.bot.password);
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL(/.*\/tickets/);

      // Step 2: Locate and click the Sign Out button in the header
      const logoutBtn = page.getByRole('button', { name: /logout|sign out/i });
      await expect(logoutBtn).toBeVisible();
      await logoutBtn.click();

      // Step 3: Assert user is returned to /login with form visible
      await expect(page).toHaveURL(/.*\/login/);
      await expect(page.getByTestId('login-email')).toBeVisible();

      // Step 4: Verify authentication token was completely purged from localStorage
      const token = await page.evaluate(() => window.localStorage.getItem('token'));
      expect(token).toBeNull();
    }
  );
});
