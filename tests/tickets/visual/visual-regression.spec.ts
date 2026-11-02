/**
 * ============================================================================
 * COMPONENT: Tickets Feature
 * FOLDER:    playwright/tickets/visual/
 * MODULE:    visual-regression.spec.ts
 * TAXONOMY:  4. Visual Regression Testing › Pixel-Differential & UI Snapshot Invariants
 * ASSIGNED WORKER: Worker 4 (project: worker-4 | account: bot.worker4@quicktix.test)
 * WORKER BATCH:    Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Captures pixel-perfect visual snapshots and compares them against baseline
 * golden references to protect against unintended layout shifts, font regressions,
 * or CSS breaking changes:
 *   1. Default Tickets Dashboard View: Snapshot of full dashboard layout.
 *   2. Ticket Card Component: Component-scoped snapshot of `.ticket-card`.
 *   3. Create Ticket Modal: Snapshot of `.modal-content` in create mode.
 *   4. Delete Confirmation Dialog: Snapshot of `[data-testid="confirm-dialog"]`.
 *   5. Mobile Viewport Layout: Snapshot under 375x667 viewport verifying mobile layout fidelity.
 *
 * COMMUNICATES WITH:
 *   - Playwright Image Comparison Engine: `expect(locator).toHaveScreenshot()`
 *   - CSS Theme & Styles: `client/src/app/components/ticket-list/ticket-list.component.css`
 *   - Golden Snapshots Directory: `playwright/tickets/visual/visual-regression.spec.ts-snapshots/`
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';

// [ASSIGNED WORKER: Worker 4] — Executed deterministically by Worker 4 (Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total))
test.describe('Tickets Feature › Visual Regression Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tickets');
    await expect(page.getByTestId('ticket-list')).toBeVisible();
    // Wait for fonts to be ready so snapshot rendering is deterministic
    await page.evaluate(() => document.fonts.ready);
  });

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Default Tickets dashboard view matches baseline visual snapshot',
    { tag: ['@visual', '@tickets'] },
    async ({ page }) => {
      const content = page.locator('.content-container');
      await expect(content).toBeVisible();

      await expect(content).toHaveScreenshot('tickets-dashboard.png', {
        animations: 'disabled',
        maxDiffPixelRatio: 0.05,
      });
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Individual Ticket card component matches baseline visual snapshot',
    { tag: ['@visual', '@tickets'] },
    async ({ page }) => {
      const firstCard = page.locator('[data-testid="ticket-row"]').first();
      await expect(firstCard).toBeVisible();

      await expect(firstCard).toHaveScreenshot('ticket-card.png', {
        animations: 'disabled',
        maxDiffPixelRatio: 0.05,
      });
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Create Ticket modal dialog matches baseline visual snapshot',
    { tag: ['@visual', '@tickets'] },
    async ({ page }) => {
      await page.getByTestId('ticket-new').click();
      const modalContent = page.locator('.modal-content');
      await expect(modalContent).toBeVisible();

      await expect(modalContent).toHaveScreenshot('ticket-create-modal.png', {
        animations: 'disabled',
        maxDiffPixelRatio: 0.05,
      });
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Delete confirmation dialog matches baseline visual snapshot',
    { tag: ['@visual', '@tickets'] },
    async ({ page }) => {
      const firstCard = page.locator('[data-testid="ticket-row"]').first();
      await firstCard.getByTestId('ticket-delete').click();

      const confirmModal = page.locator('[data-testid="confirm-dialog"] .modal-content');
      await expect(confirmModal).toBeVisible();

      await expect(confirmModal).toHaveScreenshot('ticket-delete-confirm.png', {
        animations: 'disabled',
        maxDiffPixelRatio: 0.05,
      });
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Mobile viewport (375x667) matches baseline visual snapshot',
    { tag: ['@visual', '@tickets'] },
    async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const content = page.locator('.content-container');
      await expect(content).toBeVisible();

      await expect(content).toHaveScreenshot('tickets-mobile.png', {
        animations: 'disabled',
        maxDiffPixelRatio: 0.05,
      });
    }
  );
});
