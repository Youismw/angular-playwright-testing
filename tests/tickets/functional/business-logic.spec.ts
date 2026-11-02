/**
 * ============================================================================
 * COMPONENT: Tickets Feature
 * FOLDER:    playwright/tickets/functional/
 * MODULE:    business-logic.spec.ts
 * TAXONOMY:  1. Functional Testing › Domain Rules, Metrics & Owner Scoping
 * ASSIGNED WORKER: Worker 3 (project: worker-3 | account: bot.worker3@quicktix.test)
 * WORKER BATCH:    Tickets Batch 1 of 2 (tickets/functional, tickets/resilience, tickets/api | ~195.1s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Tests domain-specific business rules, metrics integrity, and multi-tenant isolation:
 *   1. Multi-Tenant Owner Isolation: Confirms Playwright Bot sees exactly 4 seeded
 *      tickets and NEVER sees Ticket 5 (owned by User 2).
 *   2. Metrics Summary Bar Accuracy: Asserts baseline counts for Total (4),
 *      Open (2), In Progress (1), and Resolved (1).
 *   3. Dynamic Metric Synchronisation upon Ticket Creation: Creating an Open ticket
 *      increments Total to 5 and Open to 3 in real time.
 *   4. Dynamic Metric Synchronisation upon Status Change: Editing an Open ticket to
 *      Resolved decrements Open to 1 and increments Resolved to 2.
 *   5. Dynamic Metric Synchronisation upon Deletion: Deleting a ticket decrements
 *      Total and the corresponding status count.
 *   6. Metric Card Interaction: Clicking on a metric card sets the active filter
 *      and synchronizes the displayed ticket collection.
 *
 * COMMUNICATES WITH:
 *   - Components: `TicketListComponent` computed signals `ticketStats`
 *   - Fixtures: `base.fixture.ts`
 *   - Mock Data: `SEEDED_TICKETS`
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import { SEEDED_TICKETS } from '../../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 3] — Executed deterministically by Worker 3 (Tickets Batch 1 of 2 (tickets/functional, tickets/resilience, tickets/api | ~195.1s total))
test.describe('Tickets Feature › Functional › Business Logic & Metrics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tickets');
    await expect(page.getByTestId('ticket-list')).toBeVisible();
  });

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Multi-tenant owner isolation: Playwright Bot never sees foreign user ticket',
    { tag: ['@smoke', '@tickets', '@business-logic'] },
    async ({ page }) => {
      // Step 1: Assert exactly 4 ticket rows are rendered for Playwright Bot
      const rows = page.getByTestId('ticket-row');
      await expect(rows).toHaveCount(4);

      // Step 2: Assert Ticket 5 title ("Foreign user secret issue") is completely absent
      await expect(page.locator(`[data-ticket-id="${SEEDED_TICKETS.foreignTicket5.id}"]`)).toHaveCount(0);
      await expect(page.getByText('Foreign user secret issue')).toHaveCount(0);
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Metrics summary bar accurately calculates and displays baseline ticket counts',
    { tag: ['@tickets', '@business-logic'] },
    async ({ page }) => {
      // Baseline seeded counts: Total: 4, Open: 2, In Progress: 1, Resolved: 1
      const metricCards = page.locator('.metric-card');
      await expect(metricCards).toHaveCount(4);

      const totalVal = page.locator('.metric-card', { hasText: 'Total' }).locator('.metric-val');
      const openVal = page.locator('.metric-card', { hasText: 'Open' }).locator('.metric-val');
      const inProgressVal = page.locator('.metric-card', { hasText: 'In Progress' }).locator('.metric-val');
      const resolvedVal = page.locator('.metric-card', { hasText: 'Resolved' }).locator('.metric-val');

      await expect(totalVal).toHaveText('4');
      await expect(openVal).toHaveText('2');
      await expect(inProgressVal).toHaveText('1');
      await expect(resolvedVal).toHaveText('1');
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Creating a ticket dynamically updates metrics bar counts in real time',
    { tag: ['@tickets', '@business-logic'] },
    async ({ page }) => {
      // Step 1: Create a new Open ticket
      await page.getByTestId('ticket-new').click();
      await page.getByTestId('ticket-title-input').fill('Metrics increment test');
      await page.getByTestId('ticket-submit').click();
      await expect(page.getByTestId('ticket-form')).toBeHidden();

      // Step 2: Verify metrics update immediately (Total: 5, Open: 3)
      const totalVal = page.locator('.metric-card', { hasText: 'Total' }).locator('.metric-val');
      const openVal = page.locator('.metric-card', { hasText: 'Open' }).locator('.metric-val');

      await expect(totalVal).toHaveText('5');
      await expect(openVal).toHaveText('3');
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Changing status updates status badge and recalculates metrics bar',
    { tag: ['@tickets', '@business-logic'] },
    async ({ page }) => {
      // Step 1: Change Ticket 1 from Open to Resolved via quick status dropdown
      const targetCard = page.locator(`[data-ticket-id="${SEEDED_TICKETS.ticket1.id}"]`);
      await targetCard.getByTestId('ticket-quick-status').selectOption('Resolved');

      // Step 2: Assert metrics recalculate (Open: 2 -> 1, Resolved: 1 -> 2)
      const openVal = page.locator('.metric-card', { hasText: 'Open' }).locator('.metric-val');
      const resolvedVal = page.locator('.metric-card', { hasText: 'Resolved' }).locator('.metric-val');

      await expect(openVal).toHaveText('1');
      await expect(resolvedVal).toHaveText('2');
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Deleting a ticket dynamically decrements metrics bar counts in real time',
    { tag: ['@tickets', '@business-logic'] },
    async ({ page }) => {
      // Step 1: Delete Ticket 4 (which is Resolved)
      const targetCard = page.locator(`[data-ticket-id="${SEEDED_TICKETS.ticket4.id}"]`);
      await targetCard.getByTestId('ticket-delete').click();
      await page.getByTestId('confirm-accept').click();
      await expect(page.getByTestId('confirm-dialog')).toBeHidden();

      // Step 2: Assert metrics decrement (Total: 4 -> 3, Resolved: 1 -> 0)
      const totalVal = page.locator('.metric-card', { hasText: 'Total' }).locator('.metric-val');
      const resolvedVal = page.locator('.metric-card', { hasText: 'Resolved' }).locator('.metric-val');

      await expect(totalVal).toHaveText('3');
      await expect(resolvedVal).toHaveText('0');
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Clicking metric summary cards activates corresponding filter',
    { tag: ['@tickets', '@business-logic'] },
    async ({ page }) => {
      // Click "In Progress" metric card
      await page.locator('.metric-card', { hasText: 'In Progress' }).click();

      // Assert only 1 In Progress ticket is shown
      const rows = page.getByTestId('ticket-row');
      await expect(rows).toHaveCount(1);
      await expect(rows.first().getByTestId('ticket-status')).toHaveText('In Progress');

      // Click "Total" metric card to view all
      await page.locator('.metric-card', { hasText: 'Total' }).click();
      await expect(page.getByTestId('ticket-row')).toHaveCount(4);
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Filtering by a status with zero tickets (Closed) renders the ticket-empty state',
    { tag: ['@tickets', '@business-logic'] },
    async ({ page }) => {
      await page.getByTestId('status-filter').selectOption('Closed');

      await expect(page.getByTestId('ticket-row')).toHaveCount(0);
      const emptyState = page.getByTestId('ticket-empty');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText(/no tickets found/i);
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Non-matching live search query displays "No matching tickets" card and inline Clear Search button restores list',
    { tag: ['@tickets', '@business-logic'] },
    async ({ page }) => {
      const searchInput = page.getByTestId('ticket-search');
      await searchInput.fill('zzz_nonexistent_keyword_999');

      // Tickets exist in memory, but filteredTickets() is empty -> renders search empty card (not ticket-empty)
      await expect(page.getByTestId('ticket-row')).toHaveCount(0);
      await expect(page.getByTestId('ticket-empty')).toBeHidden();
      await expect(page.getByRole('heading', { name: /no matching tickets/i })).toBeVisible();

      // Click the inline "Clear Search" button inside the empty card
      await page.getByRole('button', { name: /clear search/i }).click();

      await expect(searchInput).toHaveValue('');
      await expect(page.getByTestId('ticket-row')).toHaveCount(4);
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Updating a ticket status while an active status filter is applied removes the ticket from the filtered view',
    { tag: ['@tickets', '@business-logic'] },
    async ({ page }) => {
      // Step 1: Filter by Open (shows 2 tickets: ticket1 and ticket2)
      await page.getByTestId('status-filter').selectOption('Open');
      await expect(page.getByTestId('ticket-row')).toHaveCount(2);

      // Step 2: Change ticket1 from Open to Resolved via quick-status select
      const ticket1Card = page.locator(`[data-ticket-id="${SEEDED_TICKETS.ticket1.id}"]`);
      await ticket1Card.getByTestId('ticket-quick-status').selectOption('Resolved');

      // Step 3: Because active filter is still 'Open', ticket1 is immediately spliced out of the active view
      await expect(page.getByTestId('ticket-row')).toHaveCount(1);
      await expect(ticket1Card).toHaveCount(0);
    }
  );
});
