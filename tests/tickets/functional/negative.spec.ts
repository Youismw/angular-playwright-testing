/**
 * ============================================================================
 * COMPONENT: Tickets Feature
 * FOLDER:    playwright/tickets/functional/
 * MODULE:    negative.spec.ts
 * TAXONOMY:  1. Functional Testing › Negative Testing & Failure Scenarios
 * ASSIGNED WORKER: Worker 3 (project: worker-3 | account: bot.worker3@quicktix.test)
 * WORKER BATCH:    Tickets Batch 1 of 2 (tickets/functional, tickets/resilience, tickets/api | ~195.1s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Tests defensive barriers, abortive flows, and invalid operations:
 *   1. Unauthenticated Route Guard: Direct URL access to `/tickets` without a valid
 *      token in localStorage forces an immediate client redirect to `/login`.
 *   2. Dismissing Create Modal: Clicking cancel or close button on the create ticket
 *      modal leaves the ticket collection unchanged.
 *   3. Dismissing Delete Confirmation: Clicking cancel on the delete confirmation dialog
 *      preserves the targeted ticket without deleting it.
 *   4. Empty Form Submission Prevention: Attempting to submit a blank title prevents
 *      form dispatch and leaves the modal open.
 *
 * COMMUNICATES WITH:
 *   - Client Guard: `AuthGuard` in `client/src/app/guards/auth.guard.ts`
 *   - Components: `TicketListComponent`, `TicketFormComponent`, `ConfirmDialogComponent`
 *   - Fixtures: `base.fixture.ts`
 *   - Mock Data: `SEEDED_TICKETS`
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import { SEEDED_TICKETS } from '../../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 3] — Executed deterministically by Worker 3 (Tickets Batch 1 of 2 (tickets/functional, tickets/resilience, tickets/api | ~195.1s total))
test.describe('Tickets Feature › Functional › Negative Testing', () => {
  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    '/tickets redirects unauthenticated visitor to /login',
    { tag: ['@smoke', '@tickets', '@negative'] },
    async ({ page }) => {
      // Step 1: Wipe browser session storage and cookies to simulate a logged-out visitor
      await page.context().clearCookies();
      await page.addInitScript(() => window.localStorage.clear());

      // Step 2: Attempt direct navigation to protected /tickets route
      await page.goto('/tickets');

      // Step 3: Assert client router redirects to /login and login form is visible
      await expect(page).toHaveURL(/.*\/login/);
      await expect(page.getByTestId('login-email')).toBeVisible();
    }
  );

  test.describe('Authenticated Negative Workflows', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tickets');
      await expect(page.getByTestId('ticket-list')).toBeVisible();
    });

    // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
    test(
      'Canceling create ticket modal leaves ticket list unchanged',
      { tag: ['@tickets', '@negative'] },
      async ({ page }) => {
        await expect(page.getByTestId('ticket-row')).toHaveCount(4);

        // Step 1: Open the create ticket modal
        await page.getByTestId('ticket-new').click();
        const formModal = page.getByTestId('ticket-form');
        await expect(formModal).toBeVisible();

        // Step 2: Fill in preliminary data
        await page.getByTestId('ticket-title-input').fill('Discarded Draft Ticket');

        // Step 3: Click Cancel button
        await page.getByRole('button', { name: /cancel/i }).click();

        // Step 4: Verify modal is closed
        await expect(formModal).toBeHidden();

        // Step 5: Assert row count remains strictly 4
        await expect(page.getByTestId('ticket-row')).toHaveCount(4);
        await expect(page.getByText('Discarded Draft Ticket')).toHaveCount(0);
      }
    );

    // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
    test(
      'Canceling delete confirm modal retains ticket in list',
      { tag: ['@tickets', '@negative'] },
      async ({ page }) => {
        const targetId = SEEDED_TICKETS.ticket3.id;
        const targetCard = page.locator(`[data-ticket-id="${targetId}"]`);
        await expect(targetCard).toBeVisible();

        // Step 1: Click delete to open confirmation dialog
        await targetCard.getByTestId('ticket-delete').click();
        const confirmDialog = page.getByTestId('confirm-dialog');
        await expect(confirmDialog).toBeVisible();

        // Step 2: Click "Cancel" in confirmation modal
        await page.getByTestId('confirm-cancel').click();

        // Step 3: Verify confirmation modal is dismissed
        await expect(confirmDialog).toBeHidden();

        // Step 4: Assert ticket is still visible in list
        await expect(targetCard).toBeVisible();
        await expect(targetCard.getByTestId('ticket-title')).toHaveText(SEEDED_TICKETS.ticket3.title);
      }
    );

    // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
    test(
      'Submitting empty title prevents ticket creation and displays validation alert',
      { tag: ['@tickets', '@negative'] },
      async ({ page }) => {
        // Step 1: Open the create ticket modal
        await page.getByTestId('ticket-new').click();
        await expect(page.getByTestId('ticket-form')).toBeVisible();

        // Step 2: Clear title field and trigger form submission
        await page.getByTestId('ticket-title-input').fill('');

        // Remove HTML5 required attribute to test component-level submission guard
        await page.$eval('#ticket-title-input', (el: HTMLInputElement) => el.removeAttribute('required'));
        await page.getByTestId('ticket-submit').click();

        // Step 3: Verify inline error appears and modal stays open
        const errorAlert = page.getByTestId('ticket-title-error');
        await expect(errorAlert).toBeVisible();
        await expect(errorAlert).toHaveAttribute('role', 'alert');
        await expect(page.getByTestId('ticket-form')).toBeVisible();
      }
    );
  });
});
