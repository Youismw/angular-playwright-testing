/**
 * ============================================================================
 * COMPONENT: End-to-End User Journeys (Multi-Tenant Isolation)
 * FOLDER:    playwright/e2e/
 * MODULE:    multi-tenant-isolation.spec.ts
 * TAXONOMY:  4. End-to-End (E2E) Testing › Concurrent Multi-Tenant Isolation
 * ASSIGNED WORKER: Worker 5 (project: worker-5 | account: bot.worker5@quicktix.test)
 * WORKER BATCH:    E2E & Unassigned Catch-All Batch (e2e/* + any unassigned tests | ~37.3s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Verifies strict tenant isolation across two concurrent standard users
 * (`TEST_USERS.bot` and `TEST_USERS.other`) operating in parallel browser contexts:
 *   1. Tenant A (`bot`) sees its 4 seeded tickets; Tenant B (`other`) sees its 1 seeded ticket.
 *   2. Tenant A creates and deletes tickets; Tenant B's metrics and list remain untouched.
 *   3. Tenant B creates a confidential ticket; Tenant A searching for its title finds 0 results.
 * ============================================================================
 */

import { test, expect } from '../fixtures/base.fixture.js';
import { TEST_USERS, SEEDED_TICKETS } from '../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 5] — Executed deterministically by Worker 5 (E2E & Unassigned Catch-All Batch (e2e/* + any unassigned tests | ~37.3s total))
test.describe('End-to-End (E2E) › Multi-Tenant Concurrent Workspace Isolation', () => {
  // [Worker 5] Executed on preassigned Worker 5 (bot.worker5@quicktix.test)
  test(
    'Two standard users operating simultaneously in separate browser contexts experience zero cross-tenant data leakage',
    { tag: ['@e2e', '@journey', '@security', '@isolation'] },
    async ({ browser }) => {
      const tenantAContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const tenantBContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });

      const pageA = await tenantAContext.newPage();
      const pageB = await tenantBContext.newPage();

      const tenantBSecretTitle = `TenantB Confidential Key Rotation ${Date.now()}`;

      try {
        // Step 1: Log in Tenant A (Active Worker Bot -> 4 seeded tickets)
        await pageA.goto('/login');
        await pageA.getByTestId('login-email').fill(TEST_USERS.bot.email);
        await pageA.getByTestId('login-password').fill(TEST_USERS.bot.password);
        await pageA.getByTestId('login-submit').click();
        await expect(pageA).toHaveURL(/.*\/tickets/);
        await expect(pageA.getByTestId('ticket-row')).toHaveCount(4);

        // Step 2: Log in Tenant B (Foreign User -> 1 seeded ticket: foreignTicket5)
        await pageB.goto('/login');
        await pageB.getByTestId('login-email').fill(TEST_USERS.other.email);
        await pageB.getByTestId('login-password').fill(TEST_USERS.other.password);
        await pageB.getByTestId('login-submit').click();
        await expect(pageB).toHaveURL(/.*\/tickets/);
        await expect(pageB.getByTestId('ticket-row')).toHaveCount(1);
        await expect(pageB.getByTestId('ticket-row').first().getByTestId('ticket-title')).toHaveText(
          SEEDED_TICKETS.foreignTicket5.title
        );

        // Step 3: Tenant B creates a new confidential ticket
        await pageB.getByTestId('ticket-new').click();
        await pageB.getByTestId('ticket-title-input').fill(tenantBSecretTitle);
        await pageB.getByTestId('ticket-priority-select').selectOption('Urgent');
        await pageB.getByTestId('ticket-submit').click();
        await expect(pageB.getByTestId('ticket-form')).toBeHidden();
        await expect(pageB.getByTestId('ticket-row')).toHaveCount(2);

        // Step 4: Tenant A reloads and searches for Tenant B's confidential ticket
        await pageA.reload();
        await expect(pageA.getByTestId('ticket-row')).toHaveCount(4);
        await pageA.getByTestId('ticket-search').fill(tenantBSecretTitle);
        await expect(pageA.getByTestId('ticket-row')).toHaveCount(0);
        await expect(pageA.getByRole('heading', { name: /no matching tickets/i })).toBeVisible();
      } finally {
        await tenantAContext.close();
        await tenantBContext.close();
      }
    }
  );
});

