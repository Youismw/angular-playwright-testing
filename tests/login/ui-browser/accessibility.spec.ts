/**
 * ============================================================================
 * COMPONENT: Login Page
 * FOLDER:    playwright/login/ui-browser/
 * MODULE:    accessibility.spec.ts
 * TAXONOMY:  2. UI & Browser Testing › Accessibility (a11y) & Semantic Structure
 * ASSIGNED WORKER: Worker 2 (project: worker-2 | account: bot.worker2@quicktix.test)
 * WORKER BATCH:    Login Batch 2 of 2 (login/ui-browser, login/specialized, login/visual, login/mutation, login/performance | ~100.1s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Tests accessibility requirements, ARIA attributes, and semantic HTML structure:
 *   1. Heading Hierarchy: Validates compliant heading hierarchy starting with
 *      `<h1>` ("Resolution makes it real") followed by logical `<h2>` section headings.
 *   2. Form Label Association: Ensures inputs are paired with `<label>` elements
 *      via matching `for` and `id` attributes for screen reader accessibility.
 *   3. Tab Role Semantics: Verifies tab controls expose `role="tablist"` on the
 *      container and `role="tab"` on interactive tab triggers.
 *   4. Alert Announcement: Confirms dynamic error alerts utilize `role="alert"`
 *      enabling assistive tech (screen readers) to announce errors immediately.
 *   5. Accessible Names: Validates all interactive action buttons carry human-readable
 *      accessible names for assistive tools.
 *
 * COMMUNICATES WITH:
 *   - Browser Accessibility Tree
 *   - ARIA Specifications: `role="alert"`, `role="tab"`, `role="tablist"`
 *   - Components: `LoginComponent` and `HeaderComponent`
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. Page mounts in Chromium browser.
 *   2. Playwright parses DOM structure and ARIA attributes via role selectors.
 *   3. Tests assert WCAG 2.1 AA accessibility invariants.
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import AxeBuilder from '@axe-core/playwright';

// [ASSIGNED WORKER: Worker 2] — Executed deterministically by Worker 2 (Login Batch 2 of 2 (login/ui-browser, login/specialized, login/visual, login/mutation, login/performance | ~100.1s total))
test.describe('Login Component › UI & Browser › Accessibility (a11y)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-email')).toBeVisible();
  });

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Semantic heading hierarchy contains h1 and section h2',
    { tag: ['@login', '@a11y'] },
    async ({ page }) => {
      // Step 1: Assert hero h1 exists with primary branding copy
      const heroHeading = page.getByRole('heading', { level: 1 });
      await expect(heroHeading).toBeVisible();
      await expect(heroHeading).toHaveText('Resolution makes it real');

      // Step 2: Assert card h2 exists for the form section
      const cardHeading = page.getByRole('heading', { level: 2 });
      await expect(cardHeading).toBeVisible();
      await expect(cardHeading).toHaveText('Sign In');
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Form inputs have matching label elements with for attributes',
    { tag: ['@login', '@a11y'] },
    async ({ page }) => {
      // Step 1: Assert email label is associated with #email input
      const emailLabel = page.locator('label[for="email"]');
      await expect(emailLabel).toBeVisible();
      await expect(emailLabel).toHaveText(/email address/i);

      // Step 2: Assert password label is associated with #password input
      const passwordLabel = page.locator('label[for="password"]');
      await expect(passwordLabel).toBeVisible();
      await expect(passwordLabel).toHaveText(/password/i);
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Auth tabs expose role="tablist" and role="tab" ARIA semantics',
    { tag: ['@login', '@a11y'] },
    async ({ page }) => {
      // Step 1: Assert tab container defines role="tablist"
      const tablist = page.locator('[role="tablist"]');
      await expect(tablist).toBeVisible();

      // Step 2: Assert both individual tab buttons declare role="tab"
      const loginTab = page.getByTestId('tab-login');
      const registerTab = page.getByTestId('tab-register');

      await expect(loginTab).toHaveAttribute('role', 'tab');
      await expect(registerTab).toHaveAttribute('role', 'tab');
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Dynamic error alert has role="alert" for screen readers',
    { tag: ['@login', '@a11y'] },
    async ({ page }) => {
      // Step 1: Trigger an invalid credentials error
      await page.getByTestId('login-email').fill('invalid@quicktix.test');
      await page.getByTestId('login-password').fill('WrongPassword123');
      await page.getByTestId('login-submit').click();

      // Step 2: Assert error banner provides role="alert" for immediate screen reader announcement
      const errorAlert = page.getByTestId('login-error');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toHaveAttribute('role', 'alert');
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Interactive buttons have accessible names',
    { tag: ['@login', '@a11y'] },
    async ({ page }) => {
      // Step 1: Assert primary Submit button has exact accessible name "Sign In"
      await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();

      // Step 2: Assert mode switch button has accessible name
      await expect(page.getByRole('button', { name: /create an account/i })).toBeVisible();

      // Step 3: Assert demo auto-login button has accessible name
      await expect(page.getByRole('button', { name: /auto sign in with demo account/i })).toBeVisible();
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Automated axe-core WCAG 2.1 AA audit detects zero critical ARIA or semantic violations on Sign In and Create Account views',
    { tag: ['@login', '@a11y', '@axe'] },
    async ({ page }) => {
      // Audit Sign In view
      const signInResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .disableRules(['color-contrast'])
        .analyze();
      expect(signInResults.violations).toEqual([]);

      // Switch to Create Account view and audit
      await page.getByTestId('tab-register').click();
      const registerResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .disableRules(['color-contrast'])
        .analyze();
      expect(registerResults.violations).toEqual([]);
    }
  );
});
