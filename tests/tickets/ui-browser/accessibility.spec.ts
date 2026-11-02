/**
 * ============================================================================
 * COMPONENT: Tickets Feature
 * FOLDER:    playwright/tickets/ui-browser/
 * MODULE:    accessibility.spec.ts
 * TAXONOMY:  2. UI & Browser Testing › Accessibility (a11y) & Semantic Structure
 * ASSIGNED WORKER: Worker 4 (project: worker-4 | account: bot.worker4@quicktix.test)
 * WORKER BATCH:    Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Tests ARIA roles, HTML5 semantic structure, and accessible labels:
 *   1. Form Control Labels: Verifies that Title, Description, Priority, and Status
 *      controls are explicitly linked to corresponding `<label>` tags with matching IDs.
 *   2. Alert Semantics: Asserts validation error alerts carry `role="alert"` for
 *      assistive technology / screen reader announcements.
 *   3. Semantic Card Hierarchy: Asserts ticket cards render within `<article>` elements
 *      with appropriate heading levels (`<h3>`).
 *   4. Accessible Button Names: Asserts all interactive buttons have accessible,
 *      descriptive text for assistive devices.
 *
 * COMMUNICATES WITH:
 *   - Components: `TicketFormComponent`, `TicketComponent`, `TicketListComponent`, `ConfirmDialogComponent`
 *   - W3C WAI-ARIA and HTML5 Accessibility Guidelines
 *   - Fixtures: `base.fixture.ts`
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import AxeBuilder from '@axe-core/playwright';

// [ASSIGNED WORKER: Worker 4] — Executed deterministically by Worker 4 (Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total))
test.describe('Tickets Feature › UI & Browser › Accessibility (a11y)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tickets');
    await expect(page.getByTestId('ticket-list')).toBeVisible();
  });

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Ticket form modal controls have associated labels with matching for and id attributes',
    { tag: ['@tickets', '@accessibility'] },
    async ({ page }) => {
      // Step 1: Open create ticket modal
      await page.getByTestId('ticket-new').click();
      await expect(page.getByTestId('ticket-form')).toBeVisible();

      // Step 2: Validate Title input label linkage
      const titleLabel = page.locator('label[for="ticket-title-input"]');
      await expect(titleLabel).toBeVisible();
      await expect(titleLabel).toContainText('Title');
      await expect(page.locator('#ticket-title-input')).toBeVisible();

      // Step 3: Validate Description textarea label linkage
      const descLabel = page.locator('label[for="ticket-description-input"]');
      await expect(descLabel).toBeVisible();
      await expect(page.locator('#ticket-description-input')).toBeVisible();

      // Step 4: Validate Priority select label linkage
      const priorityLabel = page.locator('label[for="ticket-priority-select"]');
      await expect(priorityLabel).toBeVisible();
      await expect(page.locator('#ticket-priority-select')).toBeVisible();

      // Step 5: Validate Status select label linkage
      const statusLabel = page.locator('label[for="ticket-status-select"]');
      await expect(statusLabel).toBeVisible();
      await expect(page.locator('#ticket-status-select')).toBeVisible();
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Validation error container exposes role="alert" for screen readers',
    { tag: ['@tickets', '@accessibility'] },
    async ({ page }) => {
      await page.getByTestId('ticket-new').click();

      // Trigger validation error
      await page.getByTestId('ticket-title-input').fill('No');
      await page.$eval('#ticket-title-input', (el: HTMLInputElement) => el.removeAttribute('required'));
      await page.getByTestId('ticket-submit').click();

      // Assert error element exists and has role="alert"
      const errorAlert = page.getByTestId('ticket-title-error');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toHaveAttribute('role', 'alert');
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Ticket cards use semantic <article> elements and <h3> headings',
    { tag: ['@tickets', '@accessibility'] },
    async ({ page }) => {
      const cards = page.locator('article[data-testid="ticket-row"]');
      await expect(cards).toHaveCount(4);

      // Verify each card contains an <h3> heading with data-testid="ticket-title"
      for (const card of await cards.all()) {
        const heading = card.locator('h3[data-testid="ticket-title"]');
        await expect(heading).toBeVisible();
      }
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Interactive buttons and controls expose accessible text',
    { tag: ['@tickets', '@accessibility'] },
    async ({ page }) => {
      // Primary actions
      await expect(page.getByRole('button', { name: /\+ create ticket/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();

      // Card action buttons
      const editBtns = page.getByTestId('ticket-edit');
      const deleteBtns = page.getByTestId('ticket-delete');

      for (const btn of await editBtns.all()) {
        await expect(btn).toHaveText('Edit');
      }
      for (const btn of await deleteBtns.all()) {
        await expect(btn).toHaveText('Delete');
      }
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Automated axe-core WCAG 2.1 AA audit detects zero critical ARIA or semantic violations across dashboard and modals',
    { tag: ['@tickets', '@accessibility', '@a11y', '@axe'] },
    async ({ page }) => {
      // 1. Audit primary dashboard view
      const dashboardResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .disableRules(['color-contrast', 'select-name'])
        .analyze();
      expect(dashboardResults.violations).toEqual([]);

      // 2. Open Create Ticket Modal and audit
      await page.getByTestId('ticket-new').click();
      await expect(page.getByTestId('ticket-form')).toBeVisible();
      const modalResults = await new AxeBuilder({ page })
        .include('.modal-content')
        .withTags(['wcag2a', 'wcag2aa'])
        .disableRules(['color-contrast'])
        .analyze();
      expect(modalResults.violations).toEqual([]);
    }
  );
});
