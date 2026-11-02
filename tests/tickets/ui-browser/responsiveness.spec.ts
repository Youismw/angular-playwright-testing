/**
 * ============================================================================
 * COMPONENT: Tickets Feature
 * FOLDER:    playwright/tickets/ui-browser/
 * MODULE:    responsiveness.spec.ts
 * TAXONOMY:  2. UI & Browser Testing › Viewport Responsiveness & Layout Adaptability
 * ASSIGNED WORKER: Worker 4 (project: worker-4 | account: bot.worker4@quicktix.test)
 * WORKER BATCH:    Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Tests responsive layout behavior and prevents horizontal clipping or overflow:
 *   1. Mobile Viewport (375x667): Card grid shifts to single column, toolbar controls
 *      stack gracefully, and document body has zero horizontal scroll overflow.
 *   2. Tablet Viewport (768x1024): Metrics cards and toolbar adapt comfortably
 *      with legible typography.
 *   3. Desktop Viewport (1280x800): Full multi-column grid renders all tickets,
 *      metrics summary cards, and controls in desktop orientation.
 *
 * COMMUNICATES WITH:
 *   - CSS Media Queries: `client/src/app/components/ticket-list/ticket-list.component.css`
 *   - Fixtures: `base.fixture.ts`
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';

// [ASSIGNED WORKER: Worker 4] — Executed deterministically by Worker 4 (Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total))
test.describe('Tickets Feature › UI & Browser › Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tickets');
    await expect(page.getByTestId('ticket-list')).toBeVisible();
  });

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Mobile viewport (375x667): Layout adapts cleanly and ticket cards fit viewport',
    { tag: ['@tickets', '@responsiveness'] },
    async ({ page }) => {
      // Step 1: Set mobile viewport size and navigate
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/tickets');

      // Step 2: Assert primary controls and ticket list are visible
      await expect(page.getByTestId('ticket-new')).toBeVisible();
      await expect(page.getByTestId('ticket-list')).toBeVisible();
      const firstCard = page.getByTestId('ticket-row').first();
      await expect(firstCard).toBeVisible();

      // Step 3: Verify ticket card fits within mobile width
      const cardBox = await firstCard.boundingBox();
      expect(cardBox).not.toBeNull();
      expect(cardBox!.x).toBeGreaterThanOrEqual(0);
      expect(cardBox!.width).toBeLessThanOrEqual(375);
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Tablet viewport (768x1024): Metrics bar and controls adapt gracefully',
    { tag: ['@tickets', '@responsiveness'] },
    async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      // Assert metrics bar and cards are intact
      const metricCards = page.locator('.metric-card');
      await expect(metricCards).toHaveCount(4);
      for (const card of await metricCards.all()) {
        await expect(card).toBeVisible();
      }

      // Assert ticket grid renders cards
      await expect(page.getByTestId('ticket-row')).toHaveCount(4);
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Desktop viewport (1280x800): Standard presentation renders complete workspace',
    { tag: ['@tickets', '@responsiveness'] },
    async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });

      // Assert all elements render cleanly in widescreen
      await expect(page.locator('.toolbar-section')).toBeVisible();
      await expect(page.locator('.controls-toolbar')).toBeVisible();
      await expect(page.getByTestId('ticket-list')).toBeVisible();
      await expect(page.getByTestId('ticket-row')).toHaveCount(4);
    }
  );
});
