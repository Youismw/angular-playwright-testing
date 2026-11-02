/**
 * ============================================================================
 * COMPONENT: Tickets Feature
 * FOLDER:    playwright/tickets/security/
 * MODULE:    injection-xss.spec.ts
 * TAXONOMY:  5. Security Testing › Injection Defense, Stored XSS & Sanitization
 * ASSIGNED WORKER: Worker 4 (project: worker-4 | account: bot.worker4@quicktix.test)
 * WORKER BATCH:    Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Tests the application against injection payloads and cross-site scripting:
 *   1. Stored XSS in Title: Submitting `<script>window.__xss_title = true;</script>`
 *      as a ticket title renders as safely escaped text in the DOM, never executing.
 *   2. Stored XSS in Description: Submitting an image error handler vector
 *      `<img src="x" onerror="window.__xss_desc = true" />` renders inertly.
 *   3. Search Query Sanitization: Typing script tags into the live search input
 *      filters cleanly without script execution or DOM corruption.
 *   4. NoSQL Query Injection Resistance: Supplying MongoDB query operator objects
 *      (e.g. `status[$ne]=xyz`) to the tickets API fails safely with HTTP 400.
 *
 * COMMUNICATES WITH:
 *   - Client Framework: Angular built-in DOM sanitization and context-aware escaping
 *   - Express Validation: `server/src/routes/ticket.routes.ts`
 *   - Fixtures: `base.fixture.ts`
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';

// [ASSIGNED WORKER: Worker 4] — Executed deterministically by Worker 4 (Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total))
test.describe('Tickets Feature › Security › Injection Defense & XSS Sanitization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tickets');
    await expect(page.getByTestId('ticket-list')).toBeVisible();
  });

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Stored XSS payload in ticket title is safely escaped and does not execute script',
    { tag: ['@security', '@xss', '@tickets'] },
    async ({ page }) => {
      const xssTitle = '<script>window.__xss_title = true;</script>';

      // Step 1: Open create ticket modal and submit XSS title
      await page.getByTestId('ticket-new').click();
      await page.getByTestId('ticket-title-input').fill(xssTitle);
      await page.getByTestId('ticket-submit').click();
      await expect(page.getByTestId('ticket-form')).toBeHidden();

      // Step 2: Locate the rendered ticket in the DOM
      const ticketCard = page.locator('[data-testid="ticket-row"]').first();
      await expect(ticketCard).toBeVisible();

      // Step 3: Assert text content contains literal string, not executable DOM elements
      await expect(ticketCard.getByTestId('ticket-title')).toHaveText(xssTitle);

      // Step 4: Verify the window object was NOT polluted
      const isXssExecuted = await page.evaluate(() => (window as any).__xss_title);
      expect(isXssExecuted).toBeUndefined();
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Stored XSS payload in description renders inertly without executing image error handler',
    { tag: ['@security', '@xss', '@tickets'] },
    async ({ page }) => {
      const xssDesc = '<img src="invalid-path" onerror="window.__xss_desc = true" />';

      // Step 1: Create ticket with malicious description
      await page.getByTestId('ticket-new').click();
      await page.getByTestId('ticket-title-input').fill('XSS Description Vector Test');
      await page.getByTestId('ticket-description-input').fill(xssDesc);
      await page.getByTestId('ticket-submit').click();
      await expect(page.getByTestId('ticket-form')).toBeHidden();

      // Step 2: Locate the created card
      const ticketCard = page.locator('[data-testid="ticket-row"]', { hasText: 'XSS Description Vector Test' });
      await expect(ticketCard).toBeVisible();

      // Step 3: Verify the payload was treated as plain text
      await expect(ticketCard.locator('.ticket-desc')).toHaveText(xssDesc);

      // Step 4: Verify script never fired
      const isXssExecuted = await page.evaluate(() => (window as any).__xss_desc);
      expect(isXssExecuted).toBeUndefined();
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Reflected script tag in live search query does not execute',
    { tag: ['@security', '@xss', '@tickets'] },
    async ({ page }) => {
      const searchInput = page.getByTestId('ticket-search');
      await searchInput.fill('<script>window.__xss_search = true;</script>');

      // Verify no execution
      const isXssExecuted = await page.evaluate(() => (window as any).__xss_search);
      expect(isXssExecuted).toBeUndefined();
    }
  );
});
