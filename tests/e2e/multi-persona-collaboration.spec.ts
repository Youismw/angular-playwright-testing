/**
 * ============================================================================
 * COMPONENT: End-to-End User Journeys (Cross-Persona Collaboration)
 * FOLDER:    playwright/e2e/
 * MODULE:    multi-persona-collaboration.spec.ts
 * TAXONOMY:  4. End-to-End (E2E) Testing › Multi-User & Admin Escalation Journey
 * ASSIGNED WORKER: Worker 5 (project: worker-5 | account: bot.worker5@quicktix.test)
 * WORKER BATCH:    E2E & Unassigned Catch-All Batch (e2e/* + any unassigned tests | ~37.3s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Orchestrates two simultaneous, isolated browser contexts representing two
 * distinct personas interacting with the same live ticket lifecycle:
 *   - Context 1 (Standard Engineer - `TEST_USERS.dev`):
 *     Logs in, creates an Urgent production incident ticket, and waits for resolution.
 *   - Context 2 (System Administrator - `TEST_USERS.admin`):
 *     Logs in, observes the engineer's newly created ticket in the global admin queue,
 *     triages and updates its status to `Resolved` with resolution notes.
 *   - Context 1 (Standard Engineer):
 *     Re-filters / reloads the workspace and verifies the Admin's resolution is live.
 * ============================================================================
 */

import { test, expect } from '../fixtures/base.fixture.js';
import { TEST_USERS } from '../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 5] — Executed deterministically by Worker 5 (E2E & Unassigned Catch-All Batch (e2e/* + any unassigned tests | ~37.3s total))
test.describe('End-to-End (E2E) › Multi-Persona User & Admin Collaboration', () => {
  // [Worker 5] Executed on preassigned Worker 5 (bot.worker5@quicktix.test)
  test(
    'Standard user submits urgent incident in Context A -> Admin resolves it in Context B -> User sees Resolved status in Context A',
    { tag: ['@e2e', '@journey', '@admin', '@rbac'] },
    async ({ browser }) => {
      // Create two completely isolated browser contexts
      const userContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const adminContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });

      const userPage = await userContext.newPage();
      const adminPage = await adminContext.newPage();

      const incidentTitle = `Prod Incident Escalation ${Date.now()}`;

      try {
        // Step 1: Worker-isolated standard user (TEST_USERS.bot) logs in on userPage
        await userPage.goto('/login');
        await userPage.getByTestId('login-email').fill(TEST_USERS.bot.email);
        await userPage.getByTestId('login-password').fill(TEST_USERS.bot.password);
        await userPage.getByTestId('login-submit').click();
        await expect(userPage).toHaveURL(/.*\/tickets/);
        await expect(userPage.getByTestId('ticket-list')).toBeVisible();

        // Step 2: Standard user creates an Urgent ticket
        await userPage.getByTestId('ticket-new').click();
        await userPage.getByTestId('ticket-title-input').fill(incidentTitle);
        await userPage.getByTestId('ticket-description-input').fill('Payment gateway returning 504 timeouts');
        await userPage.getByTestId('ticket-priority-select').selectOption('Urgent');
        await userPage.getByTestId('ticket-submit').click();
        await expect(userPage.getByTestId('ticket-form')).toBeHidden();

        const userTicketCard = userPage.locator('[data-testid="ticket-row"]', { hasText: incidentTitle });
        await expect(userTicketCard).toBeVisible();
        await expect(userTicketCard.getByTestId('ticket-status')).toHaveText('Open');

        // Step 3: System Admin logs in on adminPage
        await adminPage.goto('/login');
        await adminPage.getByTestId('login-email').fill(TEST_USERS.admin.email);
        await adminPage.getByTestId('login-password').fill(TEST_USERS.admin.password);
        await adminPage.getByTestId('login-submit').click();
        await expect(adminPage).toHaveURL(/.*\/tickets/);
        await expect(adminPage.getByTestId('user-role-badge')).toHaveText('ADMIN');

        // Step 4: Admin searches for and locates the user's new incident ticket
        await adminPage.getByTestId('ticket-search').fill(incidentTitle);
        const adminTicketCard = adminPage.locator('[data-testid="ticket-row"]', { hasText: incidentTitle });
        await expect(adminTicketCard).toBeVisible();

        // Step 5: Admin opens Edit modal, updates description and sets status to Resolved
        await adminTicketCard.getByTestId('ticket-edit').click();
        await expect(adminPage.getByTestId('ticket-form')).toBeVisible();
        await adminPage.getByTestId('ticket-description-input').fill(
          '[ADMIN RESOLVED] Upstream gateway pool restarted and verified healthy.'
        );
        await adminPage.getByTestId('ticket-status-select').selectOption('Resolved');
        await adminPage.getByTestId('ticket-submit').click();
        await expect(adminPage.getByTestId('ticket-form')).toBeHidden();
        await expect(adminTicketCard.getByTestId('ticket-status')).toHaveText('Resolved');

        // Step 6: Standard user refreshes view in Context A and verifies resolution
        await userPage.reload();
        await expect(userPage.getByTestId('ticket-list')).toBeVisible();
        const updatedUserCard = userPage.locator('[data-testid="ticket-row"]', { hasText: incidentTitle });
        await expect(updatedUserCard).toBeVisible();
        await expect(updatedUserCard.getByTestId('ticket-status')).toHaveText('Resolved');
        await expect(updatedUserCard.locator('.ticket-desc')).toContainText('[ADMIN RESOLVED]');
      } finally {
        await userContext.close();
        await adminContext.close();
      }
    }
  );
});

