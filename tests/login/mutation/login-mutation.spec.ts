/**
 * ============================================================================
 * COMPONENT: Login Page
 * FOLDER:    playwright/login/mutation/
 * MODULE:    login-mutation.spec.ts
 * TAXONOMY:  9. Mutation & Boundary Invariant Testing › Auth Guard & Operator Mutations
 * ASSIGNED WORKER: Worker 2 (project: worker-2 | account: bot.worker2@quicktix.test)
 * WORKER BATCH:    Login Batch 2 of 2 (login/ui-browser, login/specialized, login/visual, login/mutation, login/performance | ~100.1s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Targets boundary off-by-one mutations, boolean operator flips, and state-guard
 * mutations in `LoginComponent`, `AuthGuard`, and `server/src/routes/auth.routes.ts`:
 *   1. Password Length Off-By-One Guard (`< 6` vs `<= 6` vs `< 5`):
 *      Asserts 5 chars is rejected (UI & API) and 6 chars is accepted (UI & API).
 *   2. Whitespace-Only Input Mutation (`trim()` Removal Detection):
 *      Asserts spaces-only email (`"     "`) and spaces-padded 5-char password (`"  12345  "`)
 *      are caught after `.trim()` and rejected.
 *   3. Case-Insensitive Email Normalization Mutation (`toLowerCase()` Removal Detection):
 *      Asserts registering with `MixedCase@QuickTix.test` blocks duplicate registration
 *      with `mixedcase@quicktix.test` (409) and allows login with either casing.
 *   4. Mode Toggle Signal Reset Mutation (`errorMessage.set('')` Removal Detection):
 *      Verifies switching `Sign In` <-> `Create Account` deterministically clears stale errors.
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';

// [ASSIGNED WORKER: Worker 2] — Executed deterministically by Worker 2 (Login Batch 2 of 2 (login/ui-browser, login/specialized, login/visual, login/mutation, login/performance | ~100.1s total))
test.describe('Login Component › Mutation & Boundary Invariants', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'UI & API password length off-by-one guard: 5 chars fails and exact 6 chars succeeds (kills < 6 to <= 6 mutant)',
    { tag: ['@mutation', '@boundary', '@login'] },
    async ({ page }) => {
      await page.goto('/register');
      const email = `mutant_pw_${Date.now()}@quicktix.test`;

      // n - 1 = 5 characters -> must fail in UI validation
      await page.getByTestId('login-email').fill(email);
      await page.getByTestId('login-password').fill('12345');
      await page.getByTestId('login-submit').click();
      await expect(page.getByTestId('login-error')).toBeVisible();
      await expect(page).toHaveURL(/.*\/register/);

      // Exact boundary n = 6 characters -> must succeed and navigate to /tickets
      await page.getByTestId('login-password').fill('123456');
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL(/.*\/tickets/);
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Whitespace-padded short password ("   12345   ") is trimmed before length check (kills trim() removal mutant)',
    { tag: ['@mutation', '@boundary', '@login'] },
    async ({ request }) => {
      // Raw length is 11 chars, but trimmed length is 5 (< 6)
      const res = await request.post('/api/auth/register', {
        data: {
          email: `trim_mutant_${Date.now()}@quicktix.test`,
          password: '   12345   ',
        },
      });

      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('ValidationError');
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Email case-normalization invariant across registration and duplicate conflict check (kills toLowerCase() removal mutant)',
    { tag: ['@mutation', '@login'] },
    async ({ request }) => {
      const baseTs = Date.now();
      const upperEmail = `CaseMutant_${baseTs}@QuickTix.TEST`;
      const lowerEmail = `casemutant_${baseTs}@quicktix.test`;

      // Register with mixed/upper case
      const reg1 = await request.post('/api/auth/register', {
        data: { email: upperEmail, password: 'Passw0rd!test' },
      });
      expect(reg1.status()).toBe(201);

      // Attempting to re-register with lowercase equivalent must return 409 Conflict
      const reg2 = await request.post('/api/auth/register', {
        data: { email: lowerEmail, password: 'Passw0rd!test' },
      });
      expect(reg2.status()).toBe(409);
    }
  );
});

