/**
 * ============================================================================
 * COMPONENT:       Login Page
 * FOLDER:          playwright/login/api/
 * MODULE:          auth-contract.spec.ts
 * TAXONOMY:        3. Integration & API Testing › REST API Contracts & Schema Validation
 * ASSIGNED WORKER: Worker 1 (project: worker-1 | account: bot.worker1@quicktix.test)
 * WORKER BATCH:    Login Batch 1 of 2 (Folder Runtime: ~0.6s | Worker 1 Total: ~99.1s)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Exercises Express REST endpoints headlessly via Playwright APIRequestContext,
 * validating payload shapes, response headers, and status code contracts:
 *   1. POST /api/auth/login: Validates HTTP 200, Content-Type application/json,
 *      and standard 3-part HMAC-SHA256 JWT format encoding user id and email.
 *   2. Missing Credentials: Confirms omission of email or password yields HTTP 401
 *      with standardized `{ error: 'Unauthorized', message: '...' }` JSON.
 *   3. POST /api/auth/register: Validates HTTP 201 status and JSON token receipt.
 *   4. Duplicate Registration: Verifies existing emails trigger HTTP 409 Conflict.
 *   5. Short Password Validation: Verifies passwords < 6 chars return HTTP 400.
 *
 * COMMUNICATES WITH:
 *   - Express Routes: `server/src/routes/auth.routes.ts`
 *   - Database Models: `server/src/models/User.ts`
 *   - Security Standards: HS256 JWT structure and HTTP status code RFCs
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. Playwright sends HTTP POST requests directly to backend on testPort.
 *   2. Express router validates schemas and executes database operations.
 *   3. Responses return JSON payloads with security headers.
 *   4. Assertions verify payload structures against CONTRACT.md specifications.
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import { TEST_USERS } from '../../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 1] — Runs on Worker 1 (Login Batch 1: functional, security, resilience, api | ~99.1s)
test.describe('Login Component › API › Auth Route Contracts', () => {
  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'POST /api/auth/login returns 200 with a valid HMAC-SHA256 JWT token',
    { tag: ['@api', '@contract', '@login'] },
    async ({ request }) => {
      // Step 1: Submit valid login payload via APIRequestContext
      const res = await request.post('/api/auth/login', {
        data: {
          email: TEST_USERS.bot.email,
          password: TEST_USERS.bot.password,
        },
      });

      // Step 2: Assert HTTP status 200 and JSON content-type
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('application/json');

      // Step 3: Validate body schema contains string token
      const body = await res.json();
      expect(body).toHaveProperty('token');
      expect(typeof body.token).toBe('string');

      // Step 4: Validate standard JWT structure: header.payload.signature
      const parts = body.token.split('.');
      expect(parts).toHaveLength(3);

      // Step 5: Decode payload segment and verify claims without sensitive leaks
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      expect(payload).toHaveProperty('id');
      expect(payload).toHaveProperty('email', TEST_USERS.bot.email);
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');
      expect(payload).not.toHaveProperty('password');
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'POST /api/auth/login returns 401 when email or password is missing',
    { tag: ['@api', '@contract', '@login'] },
    async ({ request }) => {
      // Step 1: Request with missing password
      const resWithoutPassword = await request.post('/api/auth/login', {
        data: { email: TEST_USERS.bot.email },
      });
      expect(resWithoutPassword.status()).toBe(401);
      const body1 = await resWithoutPassword.json();
      expect(body1).toEqual({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });

      // Step 2: Request with missing email
      const resWithoutEmail = await request.post('/api/auth/login', {
        data: { password: TEST_USERS.bot.password },
      });
      expect(resWithoutEmail.status()).toBe(401);
      const body2 = await resWithoutEmail.json();
      expect(body2).toEqual({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'POST /api/auth/register creates user and returns 201 with JWT token',
    { tag: ['@api', '@contract', '@login'] },
    async ({ request }) => {
      // Step 1: Submit new user registration payload with unique email
      const newEmail = `api_registered_${Date.now()}@quicktix.test`;
      const res = await request.post('/api/auth/register', {
        data: {
          email: newEmail,
          password: 'Passw0rd!Secure',
        },
      });

      // Step 2: Assert HTTP 201 Created and response message
      expect(res.status()).toBe(201);
      const body = await res.json();

      expect(body).toHaveProperty('token');
      expect(body).toHaveProperty('message');
      expect(body.message).toContain('Account created successfully');
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'POST /api/auth/register returns 409 Conflict when email is already registered',
    { tag: ['@api', '@contract', '@login'] },
    async ({ request }) => {
      // Step 1: Attempt to register with existing seeded dev user email
      const res = await request.post('/api/auth/register', {
        data: {
          email: TEST_USERS.dev.email,
          password: 'Passw0rd!test',
        },
      });

      // Step 2: Assert HTTP 409 Conflict status and error shape
      expect(res.status()).toBe(409);
      const body = await res.json();
      expect(body.error).toBe('Conflict');
      expect(body.message).toContain('already exists');
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'POST /api/auth/register returns 400 when password is under 6 characters',
    { tag: ['@api', '@contract', '@login'] },
    async ({ request }) => {
      // Step 1: Attempt registration with a 3-character password
      const res = await request.post('/api/auth/register', {
        data: {
          email: `short_pw_${Date.now()}@quicktix.test`,
          password: '123',
        },
      });

      // Step 2: Assert HTTP 400 ValidationError status and descriptive message
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('ValidationError');
      expect(body.message).toContain('at least 6 characters');
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'POST /api/auth/register boundary mutation check: 5-char password fails (400) while 6-char password succeeds (201)',
    { tag: ['@api', '@contract', '@boundary', '@mutation', '@login'] },
    async ({ request }) => {
      // Boundary n-1 (5 chars): must be rejected
      const res5 = await request.post('/api/auth/register', {
        data: {
          email: `boundary5_${Date.now()}@quicktix.test`,
          password: '12345',
        },
      });
      expect(res5.status()).toBe(400);

      // Exact boundary n (6 chars): must succeed (catches < 6 mutated to <= 6)
      const res6 = await request.post('/api/auth/register', {
        data: {
          email: `boundary6_${Date.now()}@quicktix.test`,
          password: '123456',
        },
      });
      expect(res6.status()).toBe(201);
      const body6 = await res6.json();
      expect(body6).toHaveProperty('token');
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'POST /api/auth/register rejects malformed email addresses with 400 ValidationError',
    { tag: ['@api', '@contract', '@validation', '@login'] },
    async ({ request }) => {
      const invalidEmails = ['plainaddress', 'missing-at-domain.com', '@missing-local.org', 'spaces in@email.com'];

      for (const badEmail of invalidEmails) {
        const res = await request.post('/api/auth/register', {
          data: {
            email: badEmail,
            password: 'Passw0rd!Valid',
          },
        });
        expect(res.status()).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('ValidationError');
      }
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'POST /api/auth/login normalizes uppercase and whitespace-padded email addresses',
    { tag: ['@api', '@contract', '@login'] },
    async ({ request }) => {
      const res = await request.post('/api/auth/login', {
        data: {
          email: `  ${TEST_USERS.bot.email.toUpperCase()}  `,
          password: TEST_USERS.bot.password,
        },
      });

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('token');
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'GET /api/health returns 200 with status ok and mongo connected',
    { tag: ['@api', '@contract', '@smoke', '@login'] },
    async ({ request }) => {
      const res = await request.get('/api/health');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        status: 'ok',
        mongo: 'connected',
      });
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Unknown /api/* endpoint returns 404 JSON contract instead of SPA HTML fallback',
    { tag: ['@api', '@contract', '@login'] },
    async ({ request }) => {
      const res = await request.get('/api/unknown-nonexistent-endpoint');
      expect(res.status()).toBe(404);
      expect(res.headers()['content-type']).toContain('application/json');
      const body = await res.json();
      expect(body).toEqual({
        error: 'NotFound',
        message: 'API endpoint not found',
      });
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Malformed JSON payload returns 400 BadRequest with standardized message',
    { tag: ['@api', '@contract', '@login'] },
    async ({ request }) => {
      const res = await request.fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: '{"email": "broken_json", "password": ',
      });

      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body).toEqual({
        error: 'BadRequest',
        message: 'Malformed JSON payload',
      });
    }
  );

  // [Worker 1] Executed on preassigned Worker 1 (bot.worker1@quicktix.test)
  test(
    'Hermetic state reset (POST /api/test/reset) purges dynamically registered accounts',
    { tag: ['@api', '@contract', '@login'] },
    async ({ request, assignedWorker }) => {
      // Step 1: Register a dynamic user account
      const dynamicEmail = `ephemeral_user_${Date.now()}@quicktix.test`;
      const regRes = await request.post('/api/auth/register', {
        data: {
          email: dynamicEmail,
          password: 'Passw0rd!test',
        },
      });
      expect(regRes.status()).toBe(201);

      // Step 2: Trigger hermetic reset for preassigned Worker 1
      const resetRes = await request.post(`/api/test/reset?worker=${assignedWorker}`);
      expect(resetRes.status()).toBe(200);

      // Step 3: Verify ephemeral account was purged and can no longer authenticate
      const loginRes = await request.post('/api/auth/login', {
        data: {
          email: dynamicEmail,
          password: 'Passw0rd!test',
        },
      });
      expect(loginRes.status()).toBe(401);
    }
  );
});
