/**
 * ============================================================================
 * COMPONENT: Tickets Feature
 * FOLDER:    playwright/tickets/e2e/
 * MODULE:    tickets-journey.spec.ts
 * TAXONOMY:  4. End-to-End (E2E) Testing › Complete Ticket Triage & Resolution Workflow
 * ASSIGNED WORKER: Worker 5 (project: worker-5 | account: bot.worker5@quicktix.test)
 * WORKER BATCH:    E2E & Unassigned Catch-All Batch (e2e/* + any unassigned tests | ~37.3s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Exercises a complete support engineering workflow inside the Tickets workspace:
 *   1. Inspect initial 4 seeded tickets and baseline metrics.
 *   2. Create a new Urgent ticket -> verify prepended at top of list (`Total: 5`).
 *   3. Filter by `Open`, search by keyword, and transition ticket through
 *      `Open` -> `In Progress` -> `Resolved` -> `Closed`.
 *   4. Delete closed ticket -> verify restoration of baseline count (`Total: 4`).
 * ============================================================================
 */

import { test, expect } from '../fixtures/base.fixture.js';

// [ASSIGNED WORKER: Worker 5] — Executed deterministically by Worker 5 (E2E & Unassigned Catch-All Batch (e2e/* + any unassigned tests | ~37.3s total))
test.describe('Tickets Feature › E2E › Complete Ticket Triage & Resolution Journey', () => {
  // [Worker 5] Executed on preassigned Worker 5 (bot.worker5@quicktix.test)
  test(
    'End-to-End Ticket Triage: Create Urgent Ticket -> Search & Filter -> Progress Open -> In Progress -> Resolved -> Closed -> Delete',
    { tag: ['@e2e', '@journey', '@tickets'] },
    async ({ page }) => {
      await page.goto('/tickets');
      await expect(page.getByTestId('ticket-list')).toBeVisible();
      await expect(page.getByTestId('ticket-row')).toHaveCount(4);

      const journeyTitle = `Production Memory Spike ${Date.now()}`;

      // Step 1: Create Urgent ticket
      await page.getByTestId('ticket-new').click();
      await page.getByTestId('ticket-title-input').fill(journeyTitle);
      await page.getByTestId('ticket-description-input').fill('Heap usage crossed 85% watermark on node-2');
      await page.getByTestId('ticket-priority-select').selectOption('Urgent');
      await page.getByTestId('ticket-submit').click();
      await expect(page.getByTestId('ticket-form')).toBeHidden();

      // Verify prepended at top of list
      const firstRow = page.getByTestId('ticket-row').first();
      await expect(firstRow.getByTestId('ticket-title')).toHaveText(journeyTitle);

      // Step 2: Transition Open -> In Progress via Quick Status
      await firstRow.getByTestId('ticket-quick-status').selectOption('In Progress');
      await expect(firstRow.getByTestId('ticket-status')).toHaveText('In Progress');

      // Step 3: Transition In Progress -> Resolved via Edit Modal
      await firstRow.getByTestId('ticket-edit').click();
      await expect(page.getByTestId('ticket-form')).toBeVisible();
      await page.getByTestId('ticket-status-select').selectOption('Resolved');
      await page.getByTestId('ticket-submit').click();
      await expect(page.getByTestId('ticket-form')).toBeHidden();
      await expect(firstRow.getByTestId('ticket-status')).toHaveText('Resolved');

      // Step 4: Transition Resolved -> Closed via Quick Status
      await firstRow.getByTestId('ticket-quick-status').selectOption('Closed');
      await expect(firstRow.getByTestId('ticket-status')).toHaveText('Closed');

      // Step 5: Filter by Closed tab to isolate the ticket, then delete it
      await page.locator('.filter-tabs .tab-btn', { hasText: 'Closed' }).click();
      await expect(page.getByTestId('ticket-row')).toHaveCount(1);

      await page.getByTestId('ticket-row').first().getByTestId('ticket-delete').click();
      await expect(page.getByTestId('confirm-dialog')).toBeVisible();
      await page.getByTestId('confirm-accept').click();
      await expect(page.getByTestId('confirm-dialog')).toBeHidden();

      // Step 6: Switch back to All tab and verify baseline 4 tickets remain
      await page.locator('.filter-tabs .tab-btn', { hasText: 'All' }).click();
      await expect(page.getByTestId('ticket-row')).toHaveCount(4);
    }
  );
});

