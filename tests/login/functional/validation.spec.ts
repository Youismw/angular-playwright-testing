/**
 * ============================================================================
 * COMPONENT: Login Page
 * FOLDER:    playwright/login/functional/
 * MODULE:    validation.spec.ts
 * TAXONOMY:  1. Functional Testing › Input & Field Validation
 * ASSIGNED WORKER: Worker 1 (project: worker-1 | account: bot.worker1@quicktix.test)
 * WORKER BATCH:    Login Batch 1 of 2 (login/functional, login/security, login/resilience, login/api | ~99.1s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Tests field rules, length limits, and client/server validation contracts:
 *   1. Empty Email Submission: Leaving email blank triggers inline validation alert
 *      stating "Please enter your email address".
 *   2. Password Length Threshold: Submitting a password shorter than 6 characters
 *      during registration displays an inline alert requiring at least 6 characters.
 *   3. HTML5 Attribute Invariants: Ensures inputs enforce required attributes,
 *      email type constraints, and password masking.
 *   4. Dynamic Placeholder State: Asserts placeholder text adapts based on mode
 *      (developer hint for sign in vs standard placeholder for registration).
 *
 * COMMUNICATES WITH:
 *   - Angular Component: `LoginComponent.onSubmit()` in `client/src/app/components/login/login.component.ts`
 *   - DOM Elements: `#email` and `#password` input tags
 *   - Signals: `errorMessage()` reactive signal
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. User types invalid or boundary inputs into form fields.
 *   2. User clicks submit.
 *   3. Angular component checks field conditions before dispatching network request.
 *   4. Reactive signal `errorMessage` is set; template renders the alert box immediately.
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';

// [ASSIGNED WORKER: Worker 1] — Executed deterministically by Worker 1 (Login Batch 1 of 2 (login/functional, login/security, login/resilience, login/api | ~99.1s total))
test.describe('Login Component › Functional › Validation Testing', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-email')).toBeVisible();
  });

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Empty email submission displays inline validation error',
    { tag: ['@login', '@validation'] },
    async ({ page }) => {
      // Step 1: Fill password only, leaving the email field completely blank
      await page.getByTestId('login-password').fill('SomePassword123!');

      // Step 2: Bypass browser HTML5 required tooltip check to verify Angular signal-based onSubmit() validation
      await page.$eval('#email', (el: HTMLInputElement) => el.removeAttribute('required'));
      await page.getByTestId('login-submit').click();

      // Step 3: Verify alert displays email requirement message
      const errorAlert = page.getByTestId('login-error');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toContainText(/please enter your email address/i);
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Registration with password shorter than 6 characters shows length error',
    { tag: ['@login', '@validation'] },
    async ({ page }) => {
      // Step 1: Switch form into register mode
      await page.getByTestId('tab-register').click();

      // Step 2: Fill valid email, but a 3-character password (< 6 characters)
      await page.getByTestId('login-email').fill(`user_${Date.now()}@quicktix.test`);
      await page.getByTestId('login-password').fill('12345');
      await page.getByTestId('login-submit').click();

      // Step 3: Assert minimum length validation message is surfaced
      const errorAlert = page.getByTestId('login-error');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toContainText(/at least 6 characters/i);
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Form input fields enforce HTML5 attributes for email and required',
    { tag: ['@login', '@validation'] },
    async ({ page }) => {
      const emailInput = page.getByTestId('login-email');
      const passwordInput = page.getByTestId('login-password');

      // Step 1: Validate email field contains type="email" and required attribute
      await expect(emailInput).toHaveAttribute('type', 'email');
      await expect(emailInput).toHaveAttribute('required', '');

      // Step 2: Validate password field contains type="password" and required attribute
      await expect(passwordInput).toHaveAttribute('type', 'password');
      await expect(passwordInput).toHaveAttribute('required', '');
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Placeholder text dynamically updates according to active mode',
    { tag: ['@login', '@validation'] },
    async ({ page }) => {
      const emailInput = page.getByTestId('login-email');

      // Step 1: In Login mode, hint suggests qa.user demo email
      await expect(emailInput).toHaveAttribute('placeholder', 'qa.user@quicktix.test');

      // Step 2: Switch to Register mode and verify placeholder updates to generic hint
      await page.getByTestId('tab-register').click();
      await expect(emailInput).toHaveAttribute('placeholder', 'you@example.com');
    }
  );
});
