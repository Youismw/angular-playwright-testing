/**
 * ============================================================================
 * COMPONENT: Login Page
 * FOLDER:    playwright/login/resilience/
 * MODULE:    login-resilience.spec.ts
 * TAXONOMY:  7. Resilience, Fault Injection & Recovery Testing
 * ASSIGNED WORKER: Worker 1 (project: worker-1 | account: bot.worker1@quicktix.test)
 * WORKER BATCH:    Login Batch 1 of 2 (login/functional, login/security, login/resilience, login/api | ~99.1s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Verifies authentication resilience under transient network faults, upstream
 * gateway failures, and retry workflows:
 *   1. Fail-Then-Succeed Login Retry: Simulates a transient 500 failure on the first
 *      login attempt followed by recovery on the second click without re-typing inputs.
 *   2. Fail-Then-Succeed Registration Retry: Simulates a network drop on registration
 *      followed by clean recovery and dashboard redirection on retry.
 *   3. HTML 502 Bad Gateway Degradation: Simulates an upstream reverse-proxy returning
 *      raw HTML instead of JSON, verifying the UI displays a clean fallback message.
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import { TEST_USERS } from '../../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 1] — Executed deterministically by Worker 1 (Login Batch 1 of 2 (login/functional, login/security, login/resilience, login/api | ~99.1s total))
test.describe('Login Component › Resilience & Fault Recovery', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-email')).toBeVisible();
  });

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Transient 500 on login recovers cleanly on immediate retry without re-entering credentials',
    { tag: ['@resilience', '@login'] },
    async ({ page }) => {
      let attempt = 0;
      await page.route('**/api/auth/login', async (route) => {
        attempt++;
        if (attempt === 1) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'ServerError', message: 'Transient database failover' }),
          });
        } else {
          await route.continue();
        }
      });

      // Step 1: Enter credentials and submit (Attempt 1 -> fails with 500)
      await page.getByTestId('login-email').fill(TEST_USERS.bot.email);
      await page.getByTestId('login-password').fill(TEST_USERS.bot.password);
      await page.getByTestId('login-submit').click();

      // Step 2: Verify error banner appears and credentials remain populated in inputs
      const errorAlert = page.getByTestId('login-error');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toContainText(/transient database failover/i);
      await expect(page.getByTestId('login-email')).toHaveValue(TEST_USERS.bot.email);
      await expect(page.getByTestId('login-submit')).toBeEnabled();

      // Step 3: Click Sign In again (Attempt 2 -> succeeds)
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL(/.*\/tickets/);
      await expect(page.getByTestId('ticket-list')).toBeVisible();
      expect(attempt).toBe(2);
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Transient network drop during account registration recovers on retry',
    { tag: ['@resilience', '@login'] },
    async ({ page }) => {
      let attempt = 0;
      await page.route('**/api/auth/register', async (route) => {
        attempt++;
        if (attempt === 1) {
          await route.abort('connectionreset');
        } else {
          await route.continue();
        }
      });

      await page.getByTestId('tab-register').click();
      const uniqueEmail = `resilience_reg_${Date.now()}@quicktix.test`;
      await page.getByTestId('login-email').fill(uniqueEmail);
      await page.getByTestId('login-password').fill('Passw0rd!Resilient');

      // Attempt 1: Network connection reset
      await page.getByTestId('login-submit').click();
      await expect(page.getByTestId('login-error')).toBeVisible();

      // Attempt 2: Network restored -> succeeds
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL(/.*\/tickets/);
      expect(attempt).toBe(2);
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Non-JSON 502 Bad Gateway HTML response degrades gracefully with fallback message',
    { tag: ['@resilience', '@login'] },
    async ({ page }) => {
      await page.route('**/api/auth/login', async (route) => {
        await route.fulfill({
          status: 502,
          contentType: 'text/html',
          body: '<html><body><h1>502 Bad Gateway</h1><p>nginx/1.25.0</p></body></html>',
        });
      });

      await page.getByTestId('login-email').fill(TEST_USERS.bot.email);
      await page.getByTestId('login-password').fill(TEST_USERS.bot.password);
      await page.getByTestId('login-submit').click();

      const errorAlert = page.getByTestId('login-error');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toContainText(/failed to sign in/i);
    }
  );
});

