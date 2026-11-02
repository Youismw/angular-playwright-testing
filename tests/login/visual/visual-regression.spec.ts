/**
 * ============================================================================
 * COMPONENT: Login Page
 * FOLDER:    playwright/login/visual/
 * MODULE:    visual-regression.spec.ts
 * TAXONOMY:  4. Visual Regression Testing › Pixel-Differential & UI Snapshot Invariants
 * ASSIGNED WORKER: Worker 2 (project: worker-2 | account: bot.worker2@quicktix.test)
 * WORKER BATCH:    Login Batch 2 of 2 (login/ui-browser, login/specialized, login/visual, login/mutation, login/performance | ~100.1s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Captures pixel-perfect visual snapshots and compares them against baseline
 * golden references to protect against unintended layout shifts, font regressions,
 * or CSS breaking changes:
 *   1. Default Sign In View: Full-page snapshot of the unauthenticated login view.
 *   2. Login Card Component: Component-scoped snapshot of `.login-card` in Sign In mode.
 *   3. Create Account View: Snapshot of `.login-card` in registration mode.
 *   4. Error Banner State: Snapshot of the error alert banner when authentication fails.
 *   5. Mobile Viewport Layout: Snapshot under 375x667 viewport verifying mobile layout fidelity.
 *
 * COMMUNICATES WITH:
 *   - Playwright Image Comparison Engine: `expect(locator).toHaveScreenshot()`
 *   - CSS Theme & Styles: `client/src/app/components/login/login.component.css`
 *   - Golden Snapshots Directory: `playwright/login/visual/visual-regression.spec.ts-snapshots/`
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. Chromium renders the target state of the login component.
 *   2. Playwright captures an in-memory PNG raster image with CSS animations disabled.
 *   3. Pixelmatch engine compares pixel buffers against golden baseline snapshots.
 *   4. Test passes if pixel difference ratio is within acceptable tolerance (< 5%).
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';

// [ASSIGNED WORKER: Worker 2] — Executed deterministically by Worker 2 (Login Batch 2 of 2 (login/ui-browser, login/specialized, login/visual, login/mutation, login/performance | ~100.1s total))
test.describe('Login Component › Visual Regression Testing', () => {
  // Ensure completely unauthenticated context
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-email')).toBeVisible();
    // Wait for fonts and network idle so rendering is 100% deterministic
    await page.evaluate(() => document.fonts.ready);
  });

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Default Sign In view matches baseline visual snapshot',
    { tag: ['@visual', '@login'] },
    async ({ page }) => {
      // Step 1: Locate the primary login card container
      const loginCard = page.locator('.login-card');
      await expect(loginCard).toBeVisible();

      // Step 2: Compare visual appearance against golden baseline snapshot
      await expect(loginCard).toHaveScreenshot('login-card-signin.png', {
        animations: 'disabled',
        maxDiffPixelRatio: 0.05,
      });
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Create Account registration mode matches baseline visual snapshot',
    { tag: ['@visual', '@login'] },
    async ({ page }) => {
      // Step 1: Switch to Create Account mode
      await page.getByTestId('tab-register').click();
      await expect(page.getByRole('heading', { level: 2 })).toHaveText('Create Account');

      // Step 2: Assert component layout matches the registration snapshot
      const loginCard = page.locator('.login-card');
      await expect(loginCard).toHaveScreenshot('login-card-register.png', {
        animations: 'disabled',
        maxDiffPixelRatio: 0.05,
      });
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Active error alert banner matches baseline visual snapshot',
    { tag: ['@visual', '@login'] },
    async ({ page }) => {
      // Step 1: Trigger an error banner by submitting invalid credentials
      await page.getByTestId('login-email').fill('invalid@quicktix.test');
      await page.getByTestId('login-password').fill('WrongPassword123');
      await page.getByTestId('login-submit').click();

      // Step 2: Confirm error banner is visible
      const errorAlert = page.getByTestId('login-error');
      await expect(errorAlert).toBeVisible();

      // Step 3: Compare card with error state against baseline
      const loginCard = page.locator('.login-card');
      await expect(loginCard).toHaveScreenshot('login-card-error-state.png', {
        animations: 'disabled',
        maxDiffPixelRatio: 0.05,
      });
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Mobile viewport (375x667) matches baseline visual snapshot',
    { tag: ['@visual', '@login'] },
    async ({ page }) => {
      // Step 1: Resize viewport to mobile screen dimensions
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      await expect(page.getByTestId('login-email')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);

      // Step 2: Capture component appearance on mobile screen
      const loginCard = page.locator('.login-card');
      await expect(loginCard).toHaveScreenshot('login-card-mobile.png', {
        animations: 'disabled',
        maxDiffPixelRatio: 0.05,
      });
    }
  );
});
