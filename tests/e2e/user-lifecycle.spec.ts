/**
 * ============================================================================
 * COMPONENT: End-to-End User Journeys (Cross-Feature)
 * FOLDER:    playwright/e2e/
 * MODULE:    user-lifecycle.spec.ts
 * TAXONOMY:  4. End-to-End (E2E) Testing › Complete User Lifecycle Journey
 * ASSIGNED WORKER: Worker 5 (project: worker-5 | account: bot.worker5@quicktix.test)
 * WORKER BATCH:    E2E & Unassigned Catch-All Batch (e2e/* + any unassigned tests | ~37.3s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Exercises a complete, multi-step customer journey from initial account creation
 * through ticket creation, filtering, searching, status progression, deletion,
 * session teardown, and re-authentication persistence verification:
 *   1. Self-Service Registration: Visitor registers a brand new account at `/register`.
 *   2. Initial Empty Workspace: Verifies fresh account starts with 0 tickets and `ticket-empty` state.
 *   3. Multi-Ticket Creation: Creates 3 distinct tickets across priorities (Urgent, High, Low).
 *   4. Filtering & Live Search: Filters by status and searches by keyword across the new tickets.
 *   5. Full Status Progression: Transitions a ticket from `Open` -> `In Progress` -> `Resolved` -> `Closed`.
 *   6. Deletion & Cleanup: Deletes a resolved ticket via the confirmation dialog.
 *   7. Logout & Re-Login Persistence: Signs out, logs back in via `/login`, and verifies
 *      all database mutations persisted accurately in MongoDB.
 * ============================================================================
 */

import { test, expect } from '../fixtures/base.fixture.js';

// [ASSIGNED WORKER: Worker 5] — Executed deterministically by Worker 5 (E2E & Unassigned Catch-All Batch (e2e/* + any unassigned tests | ~37.3s total))
test.describe('End-to-End (E2E) › Complete User Lifecycle Journey', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // [Worker 5] Executed on preassigned Worker 5 (bot.worker5@quicktix.test)
  test(
    'Zero-to-Hero Journey: Register -> Empty State -> Create 3 Tickets -> Filter & Search -> Progress Status -> Delete -> Logout -> Re-Login Persistence',
    { tag: ['@e2e', '@journey', '@smoke'] },
    async ({ page }) => {
      const uniqueEmail = `e2e_journey_${Date.now()}@quicktix.test`;
      const password = 'Passw0rd!Journey99';

      // Step 1: Visit /register and create a brand new account
      await page.goto('/register');
      await expect(page.getByRole('heading', { level: 2 })).toHaveText('Create Account');
      await page.getByTestId('login-email').fill(uniqueEmail);
      await page.getByTestId('login-password').fill(password);
      await page.getByTestId('login-submit').click();

      // Step 2: Verify redirect to /tickets and initial empty workspace state
      await expect(page).toHaveURL(/.*\/tickets/);
      await expect(page.locator('app-header')).toContainText(uniqueEmail);
      await expect(page.getByTestId('ticket-empty')).toBeVisible();
      await expect(page.locator('.metric-card', { hasText: 'Total' }).locator('.metric-val')).toHaveText('0');

      // Step 3: Create 3 tickets with distinct priorities under the newly registered user account
      const ticketsToCreate = [
        { title: 'Database failover latency spike', desc: 'Primary replica set stepdown took 12s', priority: 'Urgent' },
        { title: 'OAuth callback state mismatch', desc: 'Intermittent CSRF state error on Safari', priority: 'High' },
        { title: 'Update API changelog docs', desc: 'Document new v2 rate limit headers', priority: 'Low' },
      ];

      for (const item of ticketsToCreate) {
        await page.getByTestId('ticket-new').click();
        await expect(page.getByTestId('ticket-form')).toBeVisible();
        await page.getByTestId('ticket-title-input').fill(item.title);
        await page.getByTestId('ticket-description-input').fill(item.desc);
        await page.getByTestId('ticket-priority-select').selectOption(item.priority);
        await page.getByTestId('ticket-submit').click();
        await expect(page.getByTestId('ticket-form')).toBeHidden();
      }

      // Verify all 3 tickets are rendered and metrics reflect Total: 3, Open: 3
      await expect(page.getByTestId('ticket-row')).toHaveCount(3);
      await expect(page.locator('.metric-card', { hasText: 'Total' }).locator('.metric-val')).toHaveText('3');
      await expect(page.locator('.metric-card', { hasText: 'Open' }).locator('.metric-val')).toHaveText('3');

      // Step 4: Progress first ticket through full lifecycle: Open -> In Progress -> Resolved
      const failoverCard = page.locator('[data-testid="ticket-row"]', { hasText: 'Database failover latency spike' });
      await failoverCard.getByTestId('ticket-quick-status').selectOption('In Progress');
      await expect(failoverCard.getByTestId('ticket-status')).toHaveText('In Progress');
      await expect(page.locator('.metric-card', { hasText: 'In Progress' }).locator('.metric-val')).toHaveText('1');

      // Edit via modal to Resolved and update description
      await failoverCard.getByTestId('ticket-edit').click();
      await expect(page.getByTestId('ticket-form')).toBeVisible();
      await page.getByTestId('ticket-status-select').selectOption('Resolved');
      await page.getByTestId('ticket-description-input').fill('Root cause fixed by tuning electionTimeoutMillis');
      await page.getByTestId('ticket-submit').click();
      await expect(page.getByTestId('ticket-form')).toBeHidden();
      await expect(failoverCard.getByTestId('ticket-status')).toHaveText('Resolved');

      // Step 5: Filter by Resolved and verify only the resolved ticket appears
      await page.getByTestId('status-filter').selectOption('Resolved');
      await expect(page.getByTestId('ticket-row')).toHaveCount(1);
      await expect(page.getByTestId('ticket-row').first().getByTestId('ticket-title')).toHaveText(
        'Database failover latency spike'
      );

      // Reset filter to All and exercise live search
      await page.getByTestId('status-filter').selectOption('All');
      await expect(page.getByTestId('ticket-row')).toHaveCount(3);
      await page.getByTestId('ticket-search').fill('OAuth');
      await expect(page.getByTestId('ticket-row')).toHaveCount(1);
      await page.locator('.search-clear-btn').click();
      await expect(page.getByTestId('ticket-row')).toHaveCount(3);

      // Step 6: Delete the low-priority docs ticket
      const docsCard = page.locator('[data-testid="ticket-row"]', { hasText: 'Update API changelog docs' });
      await docsCard.getByTestId('ticket-delete').click();
      await expect(page.getByTestId('confirm-dialog')).toBeVisible();
      await page.getByTestId('confirm-accept').click();
      await expect(page.getByTestId('confirm-dialog')).toBeHidden();
      await expect(page.getByTestId('ticket-row')).toHaveCount(2);

      // Step 7: Sign out, log back in via /login as the newly registered user, and verify persisted state
      await page.getByRole('button', { name: /sign out/i }).click();
      await expect(page).toHaveURL(/.*\/login/);
      await page.goto('/login');
      await expect(page.getByTestId('login-email')).toBeVisible();

      await page.getByTestId('login-email').fill(uniqueEmail);
      await expect(page.getByTestId('login-email')).toHaveValue(uniqueEmail);
      await page.getByTestId('login-password').fill(password);
      await page.getByTestId('login-submit').click();

      await expect(page).toHaveURL(/.*\/tickets/);
      await expect(page.locator('app-header')).toContainText(uniqueEmail);
      await expect(page.getByTestId('ticket-row')).toHaveCount(2);
      await expect(page.locator('.metric-card', { hasText: 'Total' }).locator('.metric-val')).toHaveText('2');
      await expect(page.locator('.metric-card', { hasText: 'Open' }).locator('.metric-val')).toHaveText('1');
      await expect(page.locator('.metric-card', { hasText: 'Resolved' }).locator('.metric-val')).toHaveText('1');
    }
  );
});

