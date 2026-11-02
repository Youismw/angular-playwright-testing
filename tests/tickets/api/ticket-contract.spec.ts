/**
 * ============================================================================
 * COMPONENT: Tickets Feature
 * FOLDER:    playwright/tickets/api/
 * MODULE:    ticket-contract.spec.ts
 * TAXONOMY:  3. Integration & API Testing › REST API Contracts & Schema Validation
 * ASSIGNED WORKER: Worker 3 (project: worker-3 | account: bot.worker3@quicktix.test)
 * WORKER BATCH:    Tickets Batch 1 of 2 (tickets/functional, tickets/resilience, tickets/api | ~195.1s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Headlessly tests the Express Ticket REST API endpoints against CONTRACT.md:
 *   1. GET /api/tickets: Verifies HTTP 200, Array response, descending sort by
 *      createdAt, and owner scoping (User 1 never receives foreign tickets).
 *   2. Unauthenticated Access: Verifies requests missing Authorization header
 *      are rejected with HTTP 401 Unauthorized.
 *   3. Filter by Status Query: Verifies ?status=Open query filtering and HTTP 400
 *      rejection for invalid enum values.
 *   4. POST /api/tickets: Validates HTTP 201 creation, schema validation rules
 *      (title min 3 chars, max 100 chars, priority/status enums), and default fields.
 *   5. PUT /api/tickets/:id: Updates ticket fields and asserts HTTP 200 response.
 *   6. Foreign / Missing Ticket Mutex: Verifies attempting to update or delete
 *      foreign tickets (Ticket 5) or non-existent IDs returns HTTP 404 Not Found.
 *   7. DELETE /api/tickets/:id: Deletes ticket, returning HTTP 204 No Content.
 *
 * COMMUNICATES WITH:
 *   - Express Routes: `server/src/routes/ticket.routes.ts`
 *   - Database Models: `server/src/models/Ticket.ts`
 *   - Fixtures: `base.fixture.ts` (auto-resets database before each test)
 *   - Mock Data: `SEEDED_TICKETS` and `TEST_USERS` from `fixtures/mock-data.ts`
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import { TEST_USERS, SEEDED_TICKETS } from '../../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 3] — Executed deterministically by Worker 3 (Tickets Batch 1 of 2 (tickets/functional, tickets/resilience, tickets/api | ~195.1s total))
test.describe('Tickets Feature › API › REST Route Contracts', () => {
  // Helper to obtain a fresh JWT token for Playwright Bot
  async function getAuthHeader(request: any): Promise<{ Authorization: string }> {
    const res = await request.post('/api/auth/login', {
      data: {
        email: TEST_USERS.bot.email,
        password: TEST_USERS.bot.password,
      },
    });
    expect(res.status(), `Login failed for bot: ${await res.text()}`).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    return { Authorization: `Bearer ${body.token}` };
  }

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'GET /api/tickets returns 200 and only tickets owned by authenticated user',
    { tag: ['@api', '@contract', '@tickets', '@smoke'] },
    async ({ request }) => {
      const headers = await getAuthHeader(request);
      const res = await request.get('/api/tickets', { headers });

      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('application/json');

      const tickets = await res.json();
      expect(Array.isArray(tickets)).toBe(true);
      expect(tickets.length).toBe(4); // Playwright Bot owns tickets 1-4

      // Assert all returned tickets belong to Playwright Bot
      for (const t of tickets) {
        expect(t.owner).toBe(TEST_USERS.bot.id);
        expect(t._id).not.toBe(SEEDED_TICKETS.foreignTicket5.id);
      }

      // Assert sorted by createdAt descending
      for (let i = 0; i < tickets.length - 1; i++) {
        const dateA = new Date(tickets[i].createdAt).getTime();
        const dateB = new Date(tickets[i + 1].createdAt).getTime();
        expect(dateA).toBeGreaterThanOrEqual(dateB);
      }
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'GET /api/tickets returns 401 Unauthorized when token is missing',
    { tag: ['@api', '@security', '@tickets', '@smoke'] },
    async ({ request }) => {
      const res = await request.get('/api/tickets');
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'GET /api/tickets?status=Open returns only tickets matching query',
    { tag: ['@api', '@contract', '@tickets'] },
    async ({ request }) => {
      const headers = await getAuthHeader(request);
      const res = await request.get('/api/tickets?status=Open', { headers });

      expect(res.status()).toBe(200);
      const tickets = await res.json();
      expect(tickets.length).toBe(2); // Seeded tickets 1 and 2 are Open
      tickets.forEach((t: any) => expect(t.status).toBe('Open'));
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'GET /api/tickets?status=InvalidStatus returns 400 Bad Request',
    { tag: ['@api', '@validation', '@tickets'] },
    async ({ request }) => {
      const headers = await getAuthHeader(request);
      const res = await request.get('/api/tickets?status=InvalidStatus', { headers });

      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('ValidationError');
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'POST /api/tickets creates ticket with 201 status and default values',
    { tag: ['@api', '@contract', '@tickets', '@smoke'] },
    async ({ request }) => {
      const headers = await getAuthHeader(request);
      const newTicketPayload = {
        title: 'API Automated Test Ticket',
        description: 'Created by automated API contract test',
        priority: 'High',
      };

      const res = await request.post('/api/tickets', {
        headers,
        data: newTicketPayload,
      });

      expect(res.status()).toBe(201);
      const ticket = await res.json();
      expect(ticket).toHaveProperty('_id');
      expect(ticket.title).toBe(newTicketPayload.title);
      expect(ticket.description).toBe(newTicketPayload.description);
      expect(ticket.priority).toBe('High');
      expect(ticket.status).toBe('Open'); // Contract default
      expect(ticket.owner).toBe(TEST_USERS.bot.id);
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'POST /api/tickets rejects payload when title is shorter than 3 characters with 400',
    { tag: ['@api', '@validation', '@tickets'] },
    async ({ request }) => {
      const headers = await getAuthHeader(request);
      const res = await request.post('/api/tickets', {
        headers,
        data: { title: 'AB' },
      });

      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('ValidationError');
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'PUT /api/tickets/:id updates ticket attributes and returns 200',
    { tag: ['@api', '@contract', '@tickets'] },
    async ({ request }) => {
      const headers = await getAuthHeader(request);
      const targetId = SEEDED_TICKETS.ticket1.id;

      const res = await request.put(`/api/tickets/${targetId}`, {
        headers,
        data: {
          status: 'Resolved',
          priority: 'Urgent',
        },
      });

      expect(res.status()).toBe(200);
      const updated = await res.json();
      expect(updated._id).toBe(targetId);
      expect(updated.status).toBe('Resolved');
      expect(updated.priority).toBe('Urgent');
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'PUT /api/tickets/:id on foreign user ticket returns 404 (IDOR Protection)',
    { tag: ['@api', '@security', '@tickets'] },
    async ({ request }) => {
      const headers = await getAuthHeader(request);
      const foreignId = SEEDED_TICKETS.foreignTicket5.id;

      const res = await request.put(`/api/tickets/${foreignId}`, {
        headers,
        data: { status: 'Closed' },
      });

      expect(res.status()).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('NotFound');
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'DELETE /api/tickets/:id removes ticket with 204 No Content',
    { tag: ['@api', '@contract', '@tickets'] },
    async ({ request }) => {
      const headers = await getAuthHeader(request);
      const targetId = SEEDED_TICKETS.ticket4.id;

      const res = await request.delete(`/api/tickets/${targetId}`, { headers });
      expect(res.status()).toBe(204);

      // Verify ticket no longer returned in list
      const listRes = await request.get('/api/tickets', { headers });
      const tickets = await listRes.json();
      const exists = tickets.some((t: any) => t._id === targetId);
      expect(exists).toBe(false);
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'DELETE /api/tickets/:id on foreign user ticket returns 404',
    { tag: ['@api', '@security', '@tickets'] },
    async ({ request }) => {
      const headers = await getAuthHeader(request);
      const foreignId = SEEDED_TICKETS.foreignTicket5.id;

      const res = await request.delete(`/api/tickets/${foreignId}`, { headers });
      expect(res.status()).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('NotFound');
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'GET /api/tickets/:id returns 200 for owned ticket, 404 for foreign ticket, and 404 for invalid ObjectId',
    { tag: ['@api', '@contract', '@tickets'] },
    async ({ request }) => {
      const headers = await getAuthHeader(request);

      // 1. Owned ticket returns 200 with full ticket object
      const ownRes = await request.get(`/api/tickets/${SEEDED_TICKETS.ticket1.id}`, { headers });
      expect(ownRes.status()).toBe(200);
      const ownBody = await ownRes.json();
      expect(ownBody._id).toBe(SEEDED_TICKETS.ticket1.id);
      expect(ownBody.title).toBe(SEEDED_TICKETS.ticket1.title);

      // 2. Foreign ticket returns 404 (never 403)
      const foreignRes = await request.get(`/api/tickets/${SEEDED_TICKETS.foreignTicket5.id}`, { headers });
      expect(foreignRes.status()).toBe(404);

      // 3. Malformed ObjectId returns 404 NotFound (never 500 CastError)
      const invalidIdRes = await request.get('/api/tickets/not-a-valid-mongo-id', { headers });
      expect(invalidIdRes.status()).toBe(404);
      const invalidIdBody = await invalidIdRes.json();
      expect(invalidIdBody.error).toBe('NotFound');
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'POST /api/tickets title boundary mutation checks (2 chars -> 400, 3 chars -> 201, 100 chars -> 201, 101 chars -> 400)',
    { tag: ['@api', '@contract', '@boundary', '@mutation', '@tickets'] },
    async ({ request }) => {
      const headers = await getAuthHeader(request);

      // Boundary 2 chars (< 3): must fail with 400
      const res2 = await request.post('/api/tickets', {
        headers,
        data: { title: 'AB' },
      });
      expect(res2.status()).toBe(400);

      // Exact lower boundary 3 chars: must succeed with 201
      const res3 = await request.post('/api/tickets', {
        headers,
        data: { title: 'ABC' },
      });
      expect(res3.status()).toBe(201);

      // Exact upper boundary 100 chars: must succeed with 201
      const res100 = await request.post('/api/tickets', {
        headers,
        data: { title: 'T'.repeat(100) },
      });
      expect(res100.status()).toBe(201);

      // Boundary 101 chars (> 100): must fail with 400
      const res101 = await request.post('/api/tickets', {
        headers,
        data: { title: 'T'.repeat(101) },
      });
      expect(res101.status()).toBe(400);
      const body101 = await res101.json();
      expect(body101.error).toBe('ValidationError');
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'POST /api/tickets description boundary mutation checks (500 chars -> 201, 501 chars -> 400)',
    { tag: ['@api', '@contract', '@boundary', '@mutation', '@tickets'] },
    async ({ request }) => {
      const headers = await getAuthHeader(request);

      // Exact upper boundary 500 chars: must succeed with 201
      const res500 = await request.post('/api/tickets', {
        headers,
        data: { title: 'Valid 500 desc ticket', description: 'D'.repeat(500) },
      });
      expect(res500.status()).toBe(201);

      // Boundary 501 chars (> 500): must fail with 400
      const res501 = await request.post('/api/tickets', {
        headers,
        data: { title: 'Invalid 501 desc ticket', description: 'D'.repeat(501) },
      });
      expect(res501.status()).toBe(400);
      const body501 = await res501.json();
      expect(body501.error).toBe('ValidationError');
    }
  );

  // [Worker 3] Executed on preassigned Worker 3 (bot.worker3@quicktix.test)
  test(
    'POST and PUT /api/tickets reject invalid priority and status enum values with 400',
    { tag: ['@api', '@validation', '@mutation', '@tickets'] },
    async ({ request }) => {
      const headers = await getAuthHeader(request);

      // Invalid priority on POST
      const badPriorityPost = await request.post('/api/tickets', {
        headers,
        data: { title: 'Valid Title', priority: 'SuperCritical' },
      });
      expect(badPriorityPost.status()).toBe(400);

      // Invalid status on POST
      const badStatusPost = await request.post('/api/tickets', {
        headers,
        data: { title: 'Valid Title', status: 'PendingReview' },
      });
      expect(badStatusPost.status()).toBe(400);

      // Invalid priority on PUT
      const badPriorityPut = await request.put(`/api/tickets/${SEEDED_TICKETS.ticket1.id}`, {
        headers,
        data: { priority: 'Blocker' },
      });
      expect(badPriorityPut.status()).toBe(400);

      // Invalid status on PUT
      const badStatusPut = await request.put(`/api/tickets/${SEEDED_TICKETS.ticket1.id}`, {
        headers,
        data: { status: 'Archived' },
      });
      expect(badStatusPut.status()).toBe(400);
    }
  );
});
