/**
 * ============================================================================
 * COMPONENT: Tickets & Auth Feature
 * FOLDER:    playwright/tickets/security/
 * MODULE:    admin-rbac.spec.ts
 * TAXONOMY:  5. Security Testing › Role-Based Access Control (RBAC) & Admin Privileges
 * ASSIGNED WORKER: Worker 4 (project: worker-4 | account: bot.worker4@quicktix.test)
 * WORKER BATCH:    Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Tests the system's dual-role architecture ('user' vs 'admin'):
 *   1. Admin Identity & Token Claims: Confirms login for admin@quicktix.test issues
 *      a JWT containing role: 'admin' and the Angular UI renders the ADMIN badge.
 *   2. Global Ticket Oversight: Validates that an Admin querying GET /api/tickets
 *      receives all system tickets (including foreign user tickets) without owner scoping.
 *   3. Cross-Tenant Administrative Mutation: Validates that an Admin can update any
 *      ticket in the system regardless of who created it.
 *   4. Cross-Tenant Administrative Deletion: Validates that an Admin can delete any
 *      ticket in the system, returning HTTP 204.
 *
 * COMMUNICATES WITH:
 *   - Express Auth Middleware: server/src/middleware/auth.ts
 *   - Express Ticket Router: server/src/routes/ticket.routes.ts
 *   - Fixtures: base.fixture.ts (deterministic autoReset)
 *   - Test Data: TEST_USERS.admin and SEEDED_TICKETS
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import { TEST_USERS, SEEDED_TICKETS } from '../../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 4] — Executed deterministically by Worker 4 (Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total))
test.describe('Security › Role-Based Access Control (RBAC) › Admin Permissions', () => {
  async function getAdminToken(request: any): Promise<string> {
    const res = await request.post('/api/auth/login', {
      data: {
        email: TEST_USERS.admin.email,
        password: TEST_USERS.admin.password,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    return body.token;
  }

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Admin login issues token with role: admin and Angular UI renders ADMIN badge in header',
    { tag: ['@security', '@admin', '@rbac'] },
    async ({ browser }) => {
      // Step 1: Open fresh unauthenticated context so existing bot session does not auto-redirect
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await context.newPage();

      await page.goto('/login');
      await expect(page.getByTestId('login-email')).toBeVisible();

      // Step 2: Fill admin credentials
      await page.getByTestId('login-email').fill(TEST_USERS.admin.email);
      await page.getByTestId('login-password').fill(TEST_USERS.admin.password);
      await page.getByTestId('login-submit').click();

      // Step 3: Verify redirection to tickets workspace
      await expect(page).toHaveURL(/.*\/tickets/);

      // Step 4: Verify header displays admin email and the ADMIN role badge
      await expect(page.locator('app-header')).toContainText(TEST_USERS.admin.email);
      const roleBadge = page.getByTestId('user-role-badge');
      await expect(roleBadge).toBeVisible();
      await expect(roleBadge).toHaveText('ADMIN');

      await context.close();
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Admin token claims include role: admin',
    { tag: ['@api', '@admin', '@rbac'] },
    async ({ request }) => {
      const token = await getAdminToken(request);
      const parts = token.split('.');
      expect(parts).toHaveLength(3);

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      expect(payload).toHaveProperty('role', 'admin');
      expect(payload).toHaveProperty('email', TEST_USERS.admin.email);
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Admin possesses global ticket oversight across all users via GET /api/tickets',
    { tag: ['@api', '@admin', '@rbac'] },
    async ({ request }) => {
      const adminToken = await getAdminToken(request);

      // Fetch tickets as admin
      const res = await request.get('/api/tickets', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status()).toBe(200);

      const tickets = await res.json();
      expect(Array.isArray(tickets)).toBe(true);

      // Verify admin sees foreign ticket 5 (which standard users are blocked from seeing)
      const foreignTicket = tickets.find((t: any) => t._id === SEEDED_TICKETS.foreignTicket5.id);
      expect(foreignTicket).toBeDefined();
      expect(foreignTicket.title).toBe(SEEDED_TICKETS.foreignTicket5.title);
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Admin can update foreign user ticket via direct PUT request',
    { tag: ['@api', '@admin', '@rbac'] },
    async ({ request }) => {
      const adminToken = await getAdminToken(request);
      const foreignId = SEEDED_TICKETS.foreignTicket5.id;

      const updateRes = await request.put(`/api/tickets/${foreignId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          title: 'Admin Overridden Foreign Title',
          status: 'Resolved',
        },
      });
      expect(updateRes.status()).toBe(200);

      const updated = await updateRes.json();
      expect(updated._id).toBe(foreignId);
      expect(updated.title).toBe('Admin Overridden Foreign Title');
      expect(updated.status).toBe('Resolved');
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Admin can delete foreign user ticket via direct DELETE request',
    { tag: ['@api', '@admin', '@rbac'] },
    async ({ request }) => {
      const adminToken = await getAdminToken(request);
      const foreignId = SEEDED_TICKETS.foreignTicket5.id;

      // Delete foreign ticket as admin
      const delRes = await request.delete(`/api/tickets/${foreignId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(delRes.status()).toBe(204);

      // Confirm ticket is gone
      const verifyRes = await request.get(`/api/tickets/${foreignId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(verifyRes.status()).toBe(404);
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Standard user (role: user) does NOT render the ADMIN role badge in header',
    { tag: ['@security', '@rbac', '@tickets'] },
    async ({ page }) => {
      await page.goto('/tickets');
      await expect(page.getByTestId('ticket-list')).toBeVisible();

      // Standard bot user is logged in; ADMIN badge must be absent from DOM
      await expect(page.getByTestId('user-role-badge')).toHaveCount(0);
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Admin UI workflow: views, edits, and deletes foreign user ticket directly in dashboard UI',
    { tag: ['@security', '@admin', '@rbac', '@tickets'] },
    async ({ browser, request }) => {
      const adminToken = await getAdminToken(request);
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await context.newPage();

      await page.addInitScript((token) => {
        window.localStorage.setItem('token', token);
      }, adminToken);

      await page.goto('/tickets');
      await expect(page.getByTestId('ticket-list')).toBeVisible();

      // Step 1: Verify Admin sees the foreign user's ticket in the UI grid
      const foreignCard = page.locator(`[data-ticket-id="${SEEDED_TICKETS.foreignTicket5.id}"]`);
      await expect(foreignCard).toBeVisible();
      await expect(foreignCard.getByTestId('ticket-title')).toHaveText(SEEDED_TICKETS.foreignTicket5.title);

      // Step 2: Admin edits the foreign ticket via UI modal
      await foreignCard.getByTestId('ticket-edit').click();
      await expect(page.getByTestId('ticket-form')).toBeVisible();
      await page.getByTestId('ticket-title-input').fill('Admin UI Edited Foreign Ticket');
      await page.getByTestId('ticket-status-select').selectOption('In Progress');
      await page.getByTestId('ticket-submit').click();
      await expect(page.getByTestId('ticket-form')).toBeHidden();

      await expect(foreignCard.getByTestId('ticket-title')).toHaveText('Admin UI Edited Foreign Ticket');
      await expect(foreignCard.getByTestId('ticket-status')).toHaveText('In Progress');

      // Step 3: Admin deletes the foreign ticket via UI confirmation modal
      await foreignCard.getByTestId('ticket-delete').click();
      await expect(page.getByTestId('confirm-dialog')).toBeVisible();
      await page.getByTestId('confirm-accept').click();
      await expect(page.getByTestId('confirm-dialog')).toBeHidden();

      await expect(foreignCard).toHaveCount(0);
      await context.close();
    }
  );
});
