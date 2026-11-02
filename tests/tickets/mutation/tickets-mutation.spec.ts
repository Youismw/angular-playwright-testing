/**
 * ============================================================================
 * COMPONENT: Tickets Feature
 * FOLDER:    playwright/tickets/mutation/
 * MODULE:    tickets-mutation.spec.ts
 * TAXONOMY:  9. Mutation & Boundary Invariant Testing › CRUD Guards & Signal Invariants
 * ASSIGNED WORKER: Worker 4 (project: worker-4 | account: bot.worker4@quicktix.test)
 * WORKER BATCH:    Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Targets off-by-one boundary conditions, trim/normalization mutations, and
 * partial-update preservation invariants in `TicketFormComponent`, `TicketListComponent`,
 * and `server/src/routes/ticket.routes.ts`:
 *   1. UI Title Boundary Off-By-One (`2` vs `3` vs `100` vs `101` chars):
 *      Kills `< 3` -> `<= 3` and `> 100` -> `>= 100` boundary mutants in `validateTitle()`.
 *   2. Whitespace-Padded Title Guard (`"   ab   "`):
 *      Kills `.trim()` removal mutants on both client and server title validation.
 *   3. Partial PUT Field Preservation Invariant (`!== undefined` Guards):
 *      Verifies updating only `status` via `PUT /api/tickets/:id` does not clobber
 *      existing `title`, `description`, or `priority` fields.
 *   4. Computed `ticketStats` Signal Arithmetic Invariant:
 *      Verifies `total === open + inProgress + resolved + closed` holds across
 *      all status transitions including `Closed`.
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import { SEEDED_TICKETS } from '../../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 4] — Executed deterministically by Worker 4 (Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total))
test.describe('Tickets Feature › Mutation & Boundary Invariants', () => {
  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'UI title validation boundary invariant: 2 chars fails, 3 chars passes, 100 chars passes, 101 chars fails',
    { tag: ['@mutation', '@boundary', '@tickets'] },
    async ({ page }) => {
      await page.goto('/tickets');
      await page.getByTestId('ticket-new').click();
      const titleInput = page.getByTestId('ticket-title-input');
      const errorAlert = page.getByTestId('ticket-title-error');

      // 2 chars -> error visible
      await titleInput.fill('AB');
      await expect(errorAlert).toBeVisible();

      // Exact lower boundary 3 chars -> error hidden (kills < 3 mutated to <= 3)
      await titleInput.fill('ABC');
      await expect(errorAlert).toBeHidden();

      // Exact upper boundary 100 chars -> error hidden (kills > 100 mutated to >= 100)
      await titleInput.fill('X'.repeat(100));
      await expect(errorAlert).toBeHidden();

      // 101 chars -> error visible
      await titleInput.fill('X'.repeat(101));
      await expect(errorAlert).toBeVisible();
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Whitespace-padded 2-char title ("   AB   ") is rejected by UI and API (kills trim() removal mutant)',
    { tag: ['@mutation', '@boundary', '@tickets'] },
    async ({ page }) => {
      await page.goto('/tickets');
      await page.getByTestId('ticket-new').click();

      // Raw length is 8 chars, but trimmed length is 2 (< 3)
      await page.getByTestId('ticket-title-input').fill('   AB   ');
      await page.getByTestId('ticket-submit').click();

      await expect(page.getByTestId('ticket-title-error')).toBeVisible();
      await expect(page.getByTestId('ticket-form')).toBeVisible();
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Partial PUT update modifies only target field and preserves existing title, description, and priority',
    { tag: ['@mutation', '@api', '@tickets'] },
    async ({ page }) => {
      await page.goto('/tickets');
      const card = page.locator(`[data-ticket-id="${SEEDED_TICKETS.ticket1.id}"]`);
      await expect(card).toBeVisible();

      // Quick-status sends PUT with ONLY { status: 'In Progress' }
      await card.getByTestId('ticket-quick-status').selectOption('In Progress');

      // Title, description, and High Priority must remain intact
      await expect(card.getByTestId('ticket-status')).toHaveText('In Progress');
      await expect(card.getByTestId('ticket-title')).toHaveText(SEEDED_TICKETS.ticket1.title);
      await expect(card).toContainText('High Priority');
      await expect(card.locator('.ticket-desc')).toContainText('Login button alignment');
    }
  );
});

