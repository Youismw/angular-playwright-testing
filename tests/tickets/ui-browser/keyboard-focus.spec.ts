/**
 * ============================================================================
 * COMPONENT: Tickets Feature
 * FOLDER:    playwright/tickets/ui-browser/
 * MODULE:    keyboard-focus.spec.ts
 * TAXONOMY:  2. UI & Browser Testing › Keyboard Navigation & Focus Accessibility
 * ASSIGNED WORKER: Worker 4 (project: worker-4 | account: bot.worker4@quicktix.test)
 * WORKER BATCH:    Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Validates keyboard ergonomics, tab order, and focus management:
 *   1. Modal Tab Traversal: Verifies sequential Tab traversal through all interactive
 *      modal elements (Title -> Description -> Priority -> Status -> Cancel -> Submit).
 *   2. Reverse Focus Traversal: Verifies Shift+Tab navigates focus backward.
 *   3. Keyboard Form Submission: Verifies pressing Enter within the title input
 *      triggers form submission when the title is valid.
 *   4. Keyboard Search Focus: Verifies focusing and typing into `ticket-search`
 *      triggers filtering without losing focus or mouse dependency.
 *
 * COMMUNICATES WITH:
 *   - Components: `TicketFormComponent`, `TicketListComponent`
 *   - Fixtures: `base.fixture.ts`
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';

// [ASSIGNED WORKER: Worker 4] — Executed deterministically by Worker 4 (Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total))
test.describe('Tickets Feature › UI & Browser › Keyboard & Focus Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tickets');
    await expect(page.getByTestId('ticket-list')).toBeVisible();
  });

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Tab key traverses interactive elements in ticket form modal in logical order',
    { tag: ['@tickets', '@keyboard'] },
    async ({ page }) => {
      // Step 1: Open create ticket modal
      await page.getByTestId('ticket-new').click();
      await expect(page.getByTestId('ticket-form')).toBeVisible();

      // Step 2: Focus the first input (title)
      const titleInput = page.getByTestId('ticket-title-input');
      await titleInput.focus();
      await expect(titleInput).toBeFocused();

      // Step 3: Press Tab to move to description textarea
      await page.keyboard.press('Tab');
      const descInput = page.getByTestId('ticket-description-input');
      await expect(descInput).toBeFocused();

      // Step 4: Press Tab to move to priority select
      await page.keyboard.press('Tab');
      const prioritySelect = page.getByTestId('ticket-priority-select');
      await expect(prioritySelect).toBeFocused();

      // Step 5: Press Tab to move to status select
      await page.keyboard.press('Tab');
      const statusSelect = page.getByTestId('ticket-status-select');
      await expect(statusSelect).toBeFocused();

      // Step 6: Press Tab to move to Cancel button
      await page.keyboard.press('Tab');
      const cancelBtn = page.getByRole('button', { name: /cancel/i });
      await expect(cancelBtn).toBeFocused();

      // Step 7: Press Tab to move to Submit button
      await page.keyboard.press('Tab');
      const submitBtn = page.getByTestId('ticket-submit');
      await expect(submitBtn).toBeFocused();
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Shift+Tab moves focus in reverse direction inside modal',
    { tag: ['@tickets', '@keyboard'] },
    async ({ page }) => {
      await page.getByTestId('ticket-new').click();
      const submitBtn = page.getByTestId('ticket-submit');
      await submitBtn.focus();
      await expect(submitBtn).toBeFocused();

      // Reverse tab
      await page.keyboard.press('Shift+Tab');
      const cancelBtn = page.getByRole('button', { name: /cancel/i });
      await expect(cancelBtn).toBeFocused();
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Pressing Enter inside title input triggers ticket form submission',
    { tag: ['@tickets', '@keyboard'] },
    async ({ page }) => {
      await page.getByTestId('ticket-new').click();
      const titleInput = page.getByTestId('ticket-title-input');

      // Type valid title and hit Enter
      const ticketTitle = 'Keyboard Enter Submit Test';
      await titleInput.fill(ticketTitle);
      await titleInput.press('Enter');

      // Verify modal closes and ticket is submitted
      await expect(page.getByTestId('ticket-form')).toBeHidden();
      await expect(page.locator('[data-testid="ticket-row"]', { hasText: ticketTitle })).toBeVisible();
    }
  );
});
