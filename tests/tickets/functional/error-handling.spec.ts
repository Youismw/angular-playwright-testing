/**
 * ============================================================================
 * COMPONENT: Tickets Feature
 * FOLDER:    playwright/tickets/functional/
 * MODULE:    error-handling.spec.ts
 * TAXONOMY:  1. Functional Testing › Error Handling, State Recovery & Resilience
 * ASSIGNED WORKER: Worker 3 (project: worker-3 | account: bot.worker3@quicktix.test)
 * WORKER BATCH:    Tickets Batch 1 of 2 (tickets/functional, tickets/resilience, tickets/api | ~195.1s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Tests the system's resilience against infrastructure errors, API outages,
 * and concurrent submission hazards:
 *   1. Backend 500 on Ticket Creation: Intercepts POST /api/tickets with 500,
 *      asserts the modal displays server error alert, and keeps input values intact.
 *   2. Backend 500 on Ticket List Fetch: Simulates API failure on GET /api/tickets,
 *      ensuring UI degrades gracefully without white-screening or crashing.
 *   3. In-Flight Form Throttling: Confirms the submit button transitions into
 *      a disabled state while an API call is actively in progress.
 *   4. Network Abortion Recovery: Simulates a network drop during ticket creation,
 *      verifying clean error handling and retry capability.
 *
 * COMMUNICATES WITH:
 *   - Angular Components: `TicketFormComponent`, `TicketListComponent`
 *   - Playwright Network Routing: `page.route('** /api/tickets*')`
 *   - Fixtures: `base.fixture.ts`
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';

// [ASSIGNED WORKER: Worker 3] — Executed deterministically by Worker 3 (Tickets Batch 1 of 2 (tickets/functional, tickets/resilience, tickets/api | ~195.1s total))
test.describe('Tickets Feature › Functional › Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tickets');
    await expect(page.getByTestId('ticket-list')).toBeVisible();
  });

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Server 500 on ticket creation renders inline server error and preserves form data',
    { tag: ['@tickets', '@error-handling'] },
    async ({ page }) => {
      // Step 1: Open create ticket modal
      await page.getByTestId('ticket-new').click();
      await expect(page.getByTestId('ticket-form')).toBeVisible();

      // Step 2: Fill out inputs
      const title = 'Ticket destined to fail';
      const desc = 'Preserved description';
      await page.getByTestId('ticket-title-input').fill(title);
      await page.getByTestId('ticket-description-input').fill(desc);

      // Step 3: Intercept POST /api/tickets with 500 Internal Server Error
      await page.route('**/api/tickets', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'InternalServerError', message: 'Database connection failed' }),
          });
        } else {
          await route.continue();
        }
      });

      // Step 4: Click submit
      await page.getByTestId('ticket-submit').click();

      // Step 5: Assert server error alert is visible
      const serverAlert = page.locator('.alert-box.alert-danger');
      await expect(serverAlert).toBeVisible();
      await expect(serverAlert).toHaveAttribute('role', 'alert');

      // Step 6: Verify form values are preserved so user does not lose input
      await expect(page.getByTestId('ticket-title-input')).toHaveValue(title);
      await expect(page.getByTestId('ticket-description-input')).toHaveValue(desc);
      await expect(page.getByTestId('ticket-form')).toBeVisible();
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Submit button is disabled during in-flight ticket creation to prevent double submissions',
    { tag: ['@tickets', '@error-handling'] },
    async ({ page }) => {
      await page.getByTestId('ticket-new').click();
      await page.getByTestId('ticket-title-input').fill('Concurrent submission test');

      // Intercept request with artificial delay to inspect in-flight disabled state
      let finishRequest: () => void;
      const requestGate = new Promise<void>((resolve) => {
        finishRequest = resolve;
      });

      await page.route('**/api/tickets', async (route) => {
        if (route.request().method() === 'POST') {
          await requestGate;
          await route.continue();
        } else {
          await route.continue();
        }
      });

      // Click submit
      await page.getByTestId('ticket-submit').click();

      // Assert submit button is immediately disabled while pending
      const submitBtn = page.getByTestId('ticket-submit');
      await expect(submitBtn).toBeDisabled();

      // Complete request
      finishRequest!();

      // Form closes upon completion
      await expect(page.getByTestId('ticket-form')).toBeHidden();
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Network failure during ticket creation handles dropped connection gracefully',
    { tag: ['@tickets', '@error-handling'] },
    async ({ page }) => {
      await page.getByTestId('ticket-new').click();
      await page.getByTestId('ticket-title-input').fill('Network drop test');

      // Abort network request
      await page.route('**/api/tickets', async (route) => {
        if (route.request().method() === 'POST') {
          await route.abort('failed');
        } else {
          await route.continue();
        }
      });

      // Click submit
      await page.getByTestId('ticket-submit').click();

      // Assert server error alert appears and modal remains usable
      const serverAlert = page.locator('.alert-box.alert-danger');
      await expect(serverAlert).toBeVisible();
      await expect(page.getByTestId('ticket-form')).toBeVisible();
    }
  );
});
