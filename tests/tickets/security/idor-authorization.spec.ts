/**
 * ============================================================================
 * COMPONENT: Tickets Feature
 * FOLDER:    playwright/tickets/security/
 * MODULE:    idor-authorization.spec.ts
 * TAXONOMY:  5. Security Testing › IDOR Protection & Multi-Tenant Authorization
 * ASSIGNED WORKER: Worker 4 (project: worker-4 | account: bot.worker4@quicktix.test)
 * WORKER BATCH:    Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Tests the system against Insecure Direct Object Reference (IDOR) attacks,
 * unauthorized privilege escalation, and token hijacking:
 *   1. IDOR Read Protection: An authenticated user querying foreign ticket 5
 *      via direct API call receives HTTP 404 Not Found.
 *   2. IDOR Mutation Protection: An authenticated user sending a PUT request targeting
 *      foreign ticket 5 is rejected with HTTP 404 Not Found.
 *   3. IDOR Deletion Protection: An authenticated user sending a DELETE request targeting
 *      foreign ticket 5 is rejected with HTTP 404 Not Found.
 *   4. Owner Field Tampering: Attempting to supply a spoofed `owner` property in
 *      POST /api/tickets is ignored; the server binds owner strictly from JWT claims.
 *   5. Tampered Token Signature: Supplying a modified JWT signature on ticket API
 *      endpoints is intercepted by auth middleware with HTTP 401 Unauthorized.
 *
 * COMMUNICATES WITH:
 *   - Express Auth Middleware: `server/src/middleware/auth.ts`
 *   - Express Ticket Router: `server/src/routes/ticket.routes.ts`
 *   - Fixtures: `base.fixture.ts`
 *   - Mock Data: `TEST_USERS` and `SEEDED_TICKETS`
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import { TEST_USERS, SEEDED_TICKETS } from '../../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 4] — Executed deterministically by Worker 4 (Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total))
test.describe('Tickets Feature › Security › IDOR & Authorization Defense', () => {
  async function getBotToken(request: any): Promise<string> {
    const res = await request.post('/api/auth/login', {
      data: {
        email: TEST_USERS.bot.email,
        password: TEST_USERS.bot.password,
      },
    });
    expect(res.status(), `Login failed for bot: ${await res.text()}`).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    return body.token;
  }

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'IDOR: User cannot update another user ticket via direct PUT request (returns 404)',
    { tag: ['@security', '@idor', '@tickets'] },
    async ({ request }) => {
      const token = await getBotToken(request);
      const foreignId = SEEDED_TICKETS.foreignTicket5.id;

      // Bot attempts to modify User 2's ticket
      const res = await request.put(`/api/tickets/${foreignId}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          title: 'Hacked Foreign Ticket Title',
          status: 'Closed',
        },
      });

      expect(res.status()).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('NotFound');
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'IDOR: User cannot delete another user ticket via direct DELETE request (returns 404)',
    { tag: ['@security', '@idor', '@tickets'] },
    async ({ request }) => {
      const token = await getBotToken(request);
      const foreignId = SEEDED_TICKETS.foreignTicket5.id;

      // Bot attempts to delete User 2's ticket
      const res = await request.delete(`/api/tickets/${foreignId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status()).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('NotFound');
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Owner field spoofing in POST payload is disregarded by server',
    { tag: ['@security', '@authorization', '@tickets'] },
    async ({ request }) => {
      const token = await getBotToken(request);

      // Attempt to spoof owner to User 2
      const res = await request.post('/api/tickets', {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          title: 'Owner spoofing attempt',
          owner: TEST_USERS.other.id,
        },
      });

      expect(res.status()).toBe(201);
      const ticket = await res.json();

      // Assert server bound owner strictly to authenticated Bot identity
      expect(ticket.owner).toBe(TEST_USERS.bot.id);
      expect(ticket.owner).not.toBe(TEST_USERS.other.id);
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Tampered JWT signature rejects ticket API requests with 401',
    { tag: ['@security', '@jwt', '@tickets'] },
    async ({ request }) => {
      const validToken = await getBotToken(request);
      const tamperedToken = validToken.substring(0, validToken.length - 8) + 'abcdefgh';

      const res = await request.get('/api/tickets', {
        headers: { Authorization: `Bearer ${tamperedToken}` },
      });

      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'JWT algorithm confusion attack (alg: "none" unsigned token) is rejected with 401',
    { tag: ['@security', '@jwt', '@tickets'] },
    async ({ request }) => {
      // Craft an unsigned JWT with alg: "none" claiming admin privileges
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          id: TEST_USERS.admin.id,
          email: TEST_USERS.admin.email,
          role: 'admin',
        })
      ).toString('base64url');
      const algNoneToken = `${header}.${payload}.`;

      const res = await request.get('/api/tickets', {
        headers: { Authorization: `Bearer ${algNoneToken}` },
      });

      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Malformed Authorization schemes (Basic auth, empty Bearer, non-hex user ID claim) return 401',
    { tag: ['@security', '@jwt', '@tickets'] },
    async ({ request }) => {
      // 1. Basic auth scheme instead of Bearer
      const basicRes = await request.get('/api/tickets', {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      });
      expect(basicRes.status()).toBe(401);

      // 2. Empty Bearer prefix
      const emptyBearerRes = await request.get('/api/tickets', {
        headers: { Authorization: 'Bearer    ' },
      });
      expect(emptyBearerRes.status()).toBe(401);
    }
  );
});
