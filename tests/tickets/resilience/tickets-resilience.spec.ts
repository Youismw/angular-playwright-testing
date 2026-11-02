/**
 * ============================================================================
 * COMPONENT:       Tickets Feature
 * FOLDER:          playwright/tickets/resilience/
 * MODULE:          tickets-resilience.spec.ts
 * TAXONOMY:        7. Resilience, Fault Injection & Concurrency Testing
 * ASSIGNED WORKER: Worker 3 (project: worker-3 | account: bot.worker3@quicktix.test)
 * WORKER BATCH:    Tickets Batch 1 of 2 (Folder Runtime: ~37.0s | Worker 3 Total: ~195.1s)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Tests the tickets workspace under race conditions, mid-session token revocation,
 * transient server failures, loading spinner transitions, and concurrent DB resets:
 *   1. RxJS `switchMap` Race Condition Prevention: Rapidly switching filters when
 *      an earlier filter request is slow guarantees the slow stale response is
 *      discarded and never overwrites the newer filter selection.
 *   2. Mid-Session 401 Token Expiration Auto-Logout: When an active session receives
 *      HTTP 401 on a ticket operation, `authInterceptor` purges localStorage and
 *      redirects to `/login`.
 *   3. Create Ticket Fail-Then-Succeed Retry: Recovering from a 500 error in the
 *      create modal creates exactly one ticket without duplicate submissions.
 *   4. Edit Ticket (`PUT`) 500 Error & Retry Recovery: Preserves modal edits on 500
 *      and applies update cleanly upon retry.
 *   5. Delete Ticket (`DELETE`) 500 Fault Handling: Closes confirm dialog safely and
 *      retains the ticket in the UI list when backend deletion fails.
 *   6. Loading Spinner (`list-loading`) Lifecycle & 500 Fallback: Verifies spinner
 *      renders during slow fetch and clears to empty state if `GET /api/tickets` fails.
 *   7. Concurrent `/api/test/reset` Mutex Stress Test: Fires 5 parallel reset calls
 *      to verify the server's `resetLock` queue prevents MongoDB `E11000` collisions.
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import { SEEDED_TICKETS } from '../../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 3] — Runs on Worker 3 (Tickets Batch 1: functional, resilience, api | ~195.1s)
test.describe('Tickets Feature › Resilience, Concurrency & Fault Recovery', () => {
  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'RxJS switchMap cancels slow out-of-order filter responses when user rapidly switches status tabs',
    { tag: ['@resilience', '@concurrency', '@tickets'] },
    async ({ page }) => {
      await page.goto('/tickets');
      await expect(page.getByTestId('ticket-list')).toBeVisible();

      // Intercept status=Open and delay it by 250ms; let status=Resolved return immediately
      await page.route('**/api/tickets*', async (route) => {
        const url = route.request().url();
        if (url.includes('status=Open')) {
          await new Promise((r) => setTimeout(r, 250));
          await route.continue();
        } else {
          await route.continue();
        }
      });

      // Step 1: Click 'Open' filter tab (triggers slow 250ms request)
      await page.locator('.filter-tabs .tab-btn', { hasText: 'Open' }).click();

      // Step 2: Immediately click 'Resolved' filter tab 30ms later (triggers fast request)
      await page.waitForTimeout(30);
      await page.locator('.filter-tabs .tab-btn', { hasText: 'Resolved' }).click();

      // Step 3: Wait 300ms so the slow 'Open' response has finished arriving over the wire
      await page.waitForTimeout(300);

      // Step 4: Assert switchMap discarded the stale 'Open' response and preserved the 1 'Resolved' ticket
      const rows = page.getByTestId('ticket-row');
      await expect(rows).toHaveCount(1);
      await expect(rows.first().getByTestId('ticket-status')).toHaveText('Resolved');
      await expect(rows.first().getByTestId('ticket-title')).toHaveText(SEEDED_TICKETS.ticket4.title);
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Mid-session HTTP 401 on ticket mutation triggers authInterceptor auto-logout and redirects to /login',
    { tag: ['@resilience', '@security', '@tickets'] },
    async ({ page }) => {
      await page.goto('/tickets');
      await expect(page.getByTestId('ticket-list')).toBeVisible();

      // Simulate token revocation/expiration on the next POST /api/tickets call
      await page.route('**/api/tickets', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Unauthorized', message: 'Valid token required' }),
          });
        } else {
          await route.continue();
        }
      });

      // Attempt to create a ticket with the revoked token
      await page.getByTestId('ticket-new').click();
      await page.getByTestId('ticket-title-input').fill('Session Expired Ticket');
      await page.getByTestId('ticket-submit').click();

      // Assert authInterceptor purged localStorage token and redirected to /login
      await expect(page).toHaveURL(/.*\/login/);
      const tokenAfter401 = await page.evaluate(() => window.localStorage.getItem('token'));
      expect(tokenAfter401).toBeNull();
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Fail-then-succeed retry on ticket creation succeeds cleanly without creating duplicate tickets',
    { tag: ['@resilience', '@tickets'] },
    async ({ page }) => {
      await page.goto('/tickets');
      await expect(page.getByTestId('ticket-list')).toBeVisible();

      let postAttempts = 0;
      await page.route('**/api/tickets', async (route) => {
        if (route.request().method() === 'POST') {
          postAttempts++;
          if (postAttempts === 1) {
            await route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'ServerError', message: 'Temporary write lock timeout' }),
            });
          } else {
            await route.continue();
          }
        } else {
          await route.continue();
        }
      });

      const retryTitle = `Retry Recovery Ticket ${Date.now()}`;
      await page.getByTestId('ticket-new').click();
      await page.getByTestId('ticket-title-input').fill(retryTitle);

      // Attempt 1: Fails with 500
      await page.getByTestId('ticket-submit').click();
      const alertBox = page.locator('.alert-box.alert-danger');
      await expect(alertBox).toBeVisible();
      await expect(alertBox).toContainText(/temporary write lock timeout/i);

      // Attempt 2: Succeeds with 201
      await page.getByTestId('ticket-submit').click();
      await expect(page.getByTestId('ticket-form')).toBeHidden();

      // Verify exactly 1 instance of the ticket was created (Total = 5)
      await expect(page.getByTestId('ticket-row')).toHaveCount(5);
      await expect(page.locator('[data-testid="ticket-row"]', { hasText: retryTitle })).toHaveCount(1);
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'PUT /api/tickets/:id 500 error in Edit modal preserves user changes and succeeds on retry',
    { tag: ['@resilience', '@tickets'] },
    async ({ page }) => {
      await page.goto('/tickets');
      await expect(page.getByTestId('ticket-list')).toBeVisible();

      let putAttempts = 0;
      await page.route(`**/api/tickets/${SEEDED_TICKETS.ticket1.id}`, async (route) => {
        if (route.request().method() === 'PUT') {
          putAttempts++;
          if (putAttempts === 1) {
            await route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'ServerError', message: 'Replica set election in progress' }),
            });
          } else {
            await route.continue();
          }
        } else {
          await route.continue();
        }
      });

      const targetCard = page.locator(`[data-ticket-id="${SEEDED_TICKETS.ticket1.id}"]`);
      await targetCard.getByTestId('ticket-edit').click();
      await expect(page.getByTestId('ticket-form')).toBeVisible();

      const updatedTitle = 'Updated After Replica Election';
      await page.getByTestId('ticket-title-input').fill(updatedTitle);

      // Attempt 1: Fails with 500
      await page.getByTestId('ticket-submit').click();
      await expect(page.locator('.alert-box.alert-danger')).toContainText(/replica set election/i);
      await expect(page.getByTestId('ticket-title-input')).toHaveValue(updatedTitle);

      // Attempt 2: Succeeds
      await page.getByTestId('ticket-submit').click();
      await expect(page.getByTestId('ticket-form')).toBeHidden();
      await expect(targetCard.getByTestId('ticket-title')).toHaveText(updatedTitle);
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'DELETE /api/tickets/:id 500 error closes confirm dialog safely and retains ticket in DOM',
    { tag: ['@resilience', '@tickets'] },
    async ({ page }) => {
      await page.goto('/tickets');
      await expect(page.getByTestId('ticket-list')).toBeVisible();

      await page.route(`**/api/tickets/${SEEDED_TICKETS.ticket4.id}`, async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'ServerError', message: 'Disk write error' }),
          });
        } else {
          await route.continue();
        }
      });

      const targetCard = page.locator(`[data-ticket-id="${SEEDED_TICKETS.ticket4.id}"]`);
      await targetCard.getByTestId('ticket-delete').click();
      await expect(page.getByTestId('confirm-dialog')).toBeVisible();
      await page.getByTestId('confirm-accept').click();

      // Modal closes cleanly and ticket4 is NOT falsely removed from the UI
      await expect(page.getByTestId('confirm-dialog')).toBeHidden();
      await expect(targetCard).toBeVisible();
      await expect(page.getByTestId('ticket-row')).toHaveCount(4);
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Loading spinner (list-loading) displays during slow fetch and degrades to empty state on GET 500 failure',
    { tag: ['@resilience', '@tickets'] },
    async ({ page }) => {
      let releaseFetch!: () => void;
      const fetchGate = new Promise<void>((resolve) => {
        releaseFetch = resolve;
      });

      await page.route('**/api/tickets*', async (route) => {
        await fetchGate;
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'ServerError', message: 'Database unreachable' }),
        });
      });

      await page.goto('/tickets');

      // While request is in-flight, loading indicator is visible
      const loadingSpinner = page.getByTestId('list-loading');
      await expect(loadingSpinner).toBeVisible();

      // Release gated 500 response and verify catchError clears loading spinner and displays empty state
      releaseFetch();
      await expect(loadingSpinner).toBeHidden();
      await expect(page.getByTestId('ticket-empty')).toBeVisible();
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'Concurrent POST /api/test/reset calls are serialized by server mutex without E11000 duplicate key errors',
    { tag: ['@resilience', '@concurrency', '@api', '@tickets'] },
    async ({ request, assignedWorker }) => {
      const w = assignedWorker;

      // Fire 5 simultaneous reset requests for preassigned Worker 3
      const responses = await Promise.all([
        request.post(`/api/test/reset?worker=${w}`),
        request.post(`/api/test/reset?worker=${w}`),
        request.post(`/api/test/reset?worker=${w}`),
        request.post(`/api/test/reset?worker=${w}`),
        request.post(`/api/test/reset?worker=${w}`),
      ]);

      for (const res of responses) {
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.status).toBe('reset_complete');
      }
    }
  );
});

