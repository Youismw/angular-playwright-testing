/**
 * ============================================================================
 * COMPONENT: Tickets Feature
 * FOLDER:    playwright/tickets/functional/
 * MODULE:    validation.spec.ts
 * TAXONOMY:  1. Functional Testing › Input & Field Validation
 * ASSIGNED WORKER: Worker 3 (project: worker-3 | account: bot.worker3@quicktix.test)
 * WORKER BATCH:    Tickets Batch 1 of 2 (tickets/functional, tickets/resilience, tickets/api | ~195.1s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Validates client-side form constraints, input boundaries, and error feedback:
 *   1. Empty Title Alert: Submitting an empty title shows `[data-testid="ticket-title-error"]`
 *      with role="alert" and text "Title must be between 3 and 100 characters".
 *   2. Title Minimum Length: Submitting 1 or 2 characters displays the length error.
 *   3. Description Character Counter: Asserts dynamic count updates (e.g. `25/500`)
 *      and respects HTML5 maxlength attribute (500).
 *   4. Select Dropdown Defaults & Options: Verifies priority defaults to "Medium"
 *      with options Low, Medium, High, Urgent; status defaults to "Open" with
 *      options Open, In Progress, Resolved, Closed.
 *   5. Real-Time Validation Clearance: Verifies that typing a valid 3+ char title
 *      clears the validation error message.
 *
 * COMMUNICATES WITH:
 *   - Components: `TicketFormComponent`
 *   - Fixtures: `base.fixture.ts`
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';

// [ASSIGNED WORKER: Worker 3] — Executed deterministically by Worker 3 (Tickets Batch 1 of 2 (tickets/functional, tickets/resilience, tickets/api | ~195.1s total))
test.describe('Tickets Feature › Functional › Validation Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tickets');
    await expect(page.getByTestId('ticket-list')).toBeVisible();

    // Open create ticket modal
    await page.getByTestId('ticket-new').click();
    await expect(page.getByTestId('ticket-form')).toBeVisible();
  });

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Empty title shows inline error alert and prevents submission',
    { tag: ['@tickets', '@validation'] },
    async ({ page }) => {
      const titleInput = page.getByTestId('ticket-title-input');
      await titleInput.fill('');

      // Remove HTML5 required attribute to test component-level validateTitle()
      await page.$eval('#ticket-title-input', (el: HTMLInputElement) => el.removeAttribute('required'));
      await page.getByTestId('ticket-submit').click();

      const errorAlert = page.getByTestId('ticket-title-error');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toHaveAttribute('role', 'alert');
      await expect(errorAlert).toContainText(/between 3 and 100 characters/i);
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Title with less than 3 characters triggers validation error',
    { tag: ['@tickets', '@validation'] },
    async ({ page }) => {
      const titleInput = page.getByTestId('ticket-title-input');

      // Input 2 characters (boundary condition)
      await titleInput.fill('Hi');
      await page.$eval('#ticket-title-input', (el: HTMLInputElement) => el.removeAttribute('required'));
      await page.getByTestId('ticket-submit').click();

      const errorAlert = page.getByTestId('ticket-title-error');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toContainText(/between 3 and 100 characters/i);
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Typing a valid title clears the active validation error',
    { tag: ['@tickets', '@validation'] },
    async ({ page }) => {
      const titleInput = page.getByTestId('ticket-title-input');

      // Trigger error
      await titleInput.fill('No');
      await page.$eval('#ticket-title-input', (el: HTMLInputElement) => el.removeAttribute('required'));
      await page.getByTestId('ticket-submit').click();
      await expect(page.getByTestId('ticket-title-error')).toBeVisible();

      // Enter valid string (>= 3 chars)
      await titleInput.fill('Valid ticket title');

      // Assert error message clears immediately
      await expect(page.getByTestId('ticket-title-error')).toBeHidden();
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Description character counter dynamically updates and enforces 500 limit',
    { tag: ['@tickets', '@validation'] },
    async ({ page }) => {
      const descInput = page.getByTestId('ticket-description-input');
      const charCounter = page.locator('.char-count');

      // Initial state
      await expect(charCounter).toHaveText('0/500');

      // Type sample text
      await descInput.fill('Playwright character count test');
      await expect(charCounter).toHaveText('31/500');

      // Verify HTML5 maxlength attribute
      await expect(descInput).toHaveAttribute('maxlength', '500');
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Priority and Status select dropdowns enforce correct default values and enum options',
    { tag: ['@tickets', '@validation'] },
    async ({ page }) => {
      const prioritySelect = page.getByTestId('ticket-priority-select');
      const statusSelect = page.getByTestId('ticket-status-select');

      // Defaults
      await expect(prioritySelect).toHaveValue('Medium');
      await expect(statusSelect).toHaveValue('Open');

      // Check all priority option elements
      const priorityOptions = await prioritySelect.locator('option').allInnerTexts();
      expect(priorityOptions).toEqual(['Low', 'Medium', 'High', 'Urgent']);

      // Check all status option elements
      const statusOptions = await statusSelect.locator('option').allInnerTexts();
      expect(statusOptions).toEqual(['Open', 'In Progress', 'Resolved', 'Closed']);
    }
  );
});
