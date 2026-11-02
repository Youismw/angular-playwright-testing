/**
 * ============================================================================
 * COMPONENT: Tickets Feature
 * FOLDER:    playwright/tickets/specialized/
 * MODULE:    tickets-specialized.spec.ts
 * TAXONOMY:  8. Specialized Testing › Unicode/i18n Fidelity, Deep-Link Wildcards & Multi-Tab State
 * ASSIGNED WORKER: Worker 4 (project: worker-4 | account: bot.worker4@quicktix.test)
 * WORKER BATCH:    Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Verifies specialized application behaviors on the Tickets dashboard:
 *   1. Unicode, Emoji, CJK, RTL & Special Character Fidelity: Confirms full UTF-8
 *      round-trip storage and live search across emojis, Japanese, Arabic, and
 *      HTML-special characters (`&`, `"`, `'`).
 *   2. Unknown Deep-Link Wildcard Route Fallback (`**` -> `/tickets`): Verifies
 *      navigating to an unknown URL (e.g. `/unknown/deep/link`) routes cleanly
 *      to `/tickets` via Express SPA fallback + Angular wildcard route.
 *   3. Multi-Tab Session State Synchronization: Verifies that signing out in
 *      Tab A clears shared `localStorage`, causing Tab B to redirect to `/login`
 *      upon reload or protected navigation.
 *   4. Zero Console Errors & Uncaught Page Exceptions Gate: Confirms a full
 *      ticket CRUD workflow emits zero runtime console errors or unhandled rejections.
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import { SEEDED_TICKETS } from '../../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 4] — Executed deterministically by Worker 4 (Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total))
test.describe('Tickets Feature › Specialized › Unicode Fidelity, Wildcard Routing & Multi-Tab State', () => {
  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Unicode, Emoji, CJK, RTL, and special punctuation characters persist and search with 100% fidelity',
    { tag: ['@specialized', '@i18n', '@tickets'] },
    async ({ page }) => {
      await page.goto('/tickets');
      await expect(page.getByTestId('ticket-list')).toBeVisible();

      const unicodeTitle = '🚀 障害報告: Система & "Quotes" — العربية #42';
      const unicodeDesc = 'Reproduction: 100% CPU on 노드를 (Node) — check café & résumé logs.';

      // Step 1: Create ticket with rich multi-script Unicode payload
      await page.getByTestId('ticket-new').click();
      await page.getByTestId('ticket-title-input').fill(unicodeTitle);
      await page.getByTestId('ticket-description-input').fill(unicodeDesc);
      await page.getByTestId('ticket-submit').click();
      await expect(page.getByTestId('ticket-form')).toBeHidden();

      // Step 2: Verify exact rendering in DOM
      const card = page.locator('[data-testid="ticket-row"]', { hasText: '障害報告' });
      await expect(card).toBeVisible();
      await expect(card.getByTestId('ticket-title')).toHaveText(unicodeTitle);
      await expect(card.locator('.ticket-desc')).toHaveText(unicodeDesc);

      // Step 3: Search by Unicode substring ("العربية")
      await page.getByTestId('ticket-search').fill('العربية');
      await expect(page.getByTestId('ticket-row')).toHaveCount(1);
      await expect(page.getByTestId('ticket-row').first().getByTestId('ticket-title')).toHaveText(unicodeTitle);
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Unknown deep-link URL (/non-existent-page/deep/route) falls back via SPA middleware and redirects to /tickets',
    { tag: ['@specialized', '@navigation', '@tickets'] },
    async ({ page }) => {
      await page.goto('/non-existent-page/deep/route');

      // Angular wildcard route { path: '**', redirectTo: '/tickets' } activates
      await expect(page).toHaveURL(/.*\/tickets/);
      await expect(page.getByTestId('ticket-list')).toBeVisible();
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Multi-tab session teardown: Signing out in Tab 1 invalidates shared origin localStorage for Tab 2',
    { tag: ['@specialized', '@tickets'] },
    async ({ context }) => {
      const tab1 = await context.newPage();
      const tab2 = await context.newPage();

      await tab1.goto('/tickets');
      await tab2.goto('/tickets');
      await expect(tab1.getByTestId('ticket-list')).toBeVisible();
      await expect(tab2.getByTestId('ticket-list')).toBeVisible();

      // Sign out in Tab 1
      await tab1.getByRole('button', { name: /sign out/i }).click();
      await expect(tab1).toHaveURL(/.*\/login/);

      // Without even reloading Tab 2, AuthService's window 'storage' listener automatically redirects Tab 2 to /login
      await expect(tab2).toHaveURL(/.*\/login/);
      await expect(tab2.getByTestId('login-email')).toBeVisible();

      await tab1.close();
      await tab2.close();
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'TicketFormComponent modal header toggles ("Create New Ticket" vs "Edit Ticket"), pre-populates fields, and closes via top-right X button',
    { tag: ['@specialized', '@tickets'] },
    async ({ page }) => {
      await page.goto('/tickets');
      await expect(page.getByTestId('ticket-list')).toBeVisible();

      // 1. Open in Create mode -> verify header is 'Create New Ticket' and close via top-right X button
      await page.getByTestId('ticket-new').click();
      await expect(page.getByTestId('ticket-form')).toBeVisible();
      await expect(page.locator('.modal-header h3')).toHaveText('Create New Ticket');

      const closeXBtn = page.locator('button.close-btn[aria-label="Close modal"]');
      await expect(closeXBtn).toBeVisible();
      await closeXBtn.click();
      await expect(page.getByTestId('ticket-form')).toBeHidden();

      // 2. Open in Edit mode on ticket3 -> verify header is 'Edit Ticket' and all 4 fields pre-populate
      const ticket3Card = page.locator(`[data-ticket-id="${SEEDED_TICKETS.ticket3.id}"]`);
      await ticket3Card.getByTestId('ticket-edit').click();
      await expect(page.getByTestId('ticket-form')).toBeVisible();
      await expect(page.locator('.modal-header h3')).toHaveText('Edit Ticket');

      await expect(page.getByTestId('ticket-title-input')).toHaveValue(SEEDED_TICKETS.ticket3.title);
      await expect(page.getByTestId('ticket-description-input')).toHaveValue('Memory grows steadily during load test');
      await expect(page.getByTestId('ticket-priority-select')).toHaveValue(SEEDED_TICKETS.ticket3.priority);
      await expect(page.getByTestId('ticket-status-select')).toHaveValue(SEEDED_TICKETS.ticket3.status);

      // Dismiss via top-right X button
      await closeXBtn.click();
      await expect(page.getByTestId('ticket-form')).toBeHidden();
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'TicketComponent renders dynamic priority/status CSS badge classes and formatted <time class="ticket-date"> element',
    { tag: ['@specialized', '@tickets'] },
    async ({ page }) => {
      await page.goto('/tickets');
      await expect(page.getByTestId('ticket-list')).toBeVisible();

      // Ticket 1: High Priority, Open
      const card1 = page.locator(`[data-ticket-id="${SEEDED_TICKETS.ticket1.id}"]`);
      await expect(card1.locator('.priority-badge')).toHaveClass(/priority-high/);
      await expect(card1.getByTestId('ticket-status')).toHaveClass(/badge-open/);

      // Ticket 3: Medium Priority, In Progress (spaced status converted to kebab-case 'badge-in-progress')
      const card3 = page.locator(`[data-ticket-id="${SEEDED_TICKETS.ticket3.id}"]`);
      await expect(card3.locator('.priority-badge')).toHaveClass(/priority-medium/);
      await expect(card3.getByTestId('ticket-status')).toHaveClass(/badge-in-progress/);

      // Ticket 4: Low Priority, Resolved
      const card4 = page.locator(`[data-ticket-id="${SEEDED_TICKETS.ticket4.id}"]`);
      await expect(card4.locator('.priority-badge')).toHaveClass(/priority-low/);
      await expect(card4.getByTestId('ticket-status')).toHaveClass(/badge-resolved/);

      // Verify <time class="ticket-date"> renders a formatted date string
      const timeEl = card1.locator('time.ticket-date');
      await expect(timeEl).toBeVisible();
      const dateText = (await timeEl.innerText()).trim();
      expect(dateText.length).toBeGreaterThan(4);
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Full dashboard CRUD lifecycle produces zero console.error logs or uncaught page exceptions',
    { tag: ['@specialized', '@tickets'] },
    async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      page.on('pageerror', (err) => {
        pageErrors.push(err.message);
      });

      await page.goto('/tickets');
      await expect(page.getByTestId('ticket-list')).toBeVisible();

      // Create
      await page.getByTestId('ticket-new').click();
      await page.getByTestId('ticket-title-input').fill('Zero Console Error Ticket');
      await page.getByTestId('ticket-submit').click();
      await expect(page.getByTestId('ticket-form')).toBeHidden();

      // Filter & Search
      await page.getByTestId('status-filter').selectOption('Open');
      await page.getByTestId('status-filter').selectOption('All');
      await page.getByTestId('ticket-search').fill('Zero Console');
      await page.locator('.search-clear-btn').click();

      // Quick status update
      const card = page.locator(`[data-ticket-id="${SEEDED_TICKETS.ticket2.id}"]`);
      const updatePromise = page.waitForResponse(
        (res) => res.url().includes(`/api/tickets/${SEEDED_TICKETS.ticket2.id}`) && res.request().method() === 'PUT'
      );
      await card.getByTestId('ticket-quick-status').selectOption('In Progress');
      const updateRes = await updatePromise;
      expect(updateRes.ok()).toBe(true);
      await expect(card.getByTestId('ticket-status')).toHaveText('In Progress');

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    }
  );
});

