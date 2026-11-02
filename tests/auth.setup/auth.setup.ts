/**
 * ============================================================================
 * FOLDER:       playwright/auth.setup/
 * MODULE:       auth.setup.ts (Deterministic 5-Worker Fast Auth Setup)
 * OWNED BY:     WORKER 1 (setup project — always executes on Worker 1)
 * RUNTIME:      ~0.2s
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Executes on WORKER 1 prior to the 5 parallel worker projects (`worker-1`..`worker-5`)
 * to establish authenticated storage states for all 5 preassigned workers:
 *   1. Invokes `POST /api/test/reset?all=true` to seed isolated accounts & tickets
 *      for Workers 1..5.
 *   2. Authenticates Workers 1, 2, 3, 4, and 5 concurrently via `POST /api/auth/login`
 *      and saves their 5 JWT storage state files (`.auth/user-1.json`..`.auth/user-5.json`):
 *      - `.auth/user-1.json` -> WORKER 1 (`bot.worker1@quicktix.test`):
 *        Owns `auth.setup` + `login/functional`, `login/security`, `login/resilience`, `login/api`
 *      - `.auth/user-2.json` -> WORKER 2 (`bot.worker2@quicktix.test`):
 *        Owns `login/ui-browser`, `login/specialized`, `login/visual`, `login/mutation`, `login/performance`
 *      - `.auth/user-3.json` -> WORKER 3 (`bot.worker3@quicktix.test`):
 *        Owns `tickets/functional`, `tickets/resilience`, `tickets/api`
 *      - `.auth/user-4.json` -> WORKER 4 (`bot.worker4@quicktix.test`):
 *        Owns `tickets/ui-browser`, `tickets/specialized`, `tickets/security`, `tickets/visual`, `tickets/mutation`, `tickets/performance`
 *      - `.auth/user-5.json` -> WORKER 5 (`bot.worker5@quicktix.test`):
 *        Owns `e2e/` journeys + Catch-All for any new unassigned `.spec.ts` files
 * ============================================================================
 */

import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import { getWorkerUser, getForeignUser, getWorkerTickets, TEST_USERS } from '../fixtures/mock-data.js';

const NUM_WORKERS = 5; // Pre-authenticates all 5 deterministic workers (Workers 1..5)

const WORKER_AUTH_FILE_METADATA: Record<
  number,
  {
    assignedWorker: string;
    batchSummary: string;
    ownedTestSuites: string[];
  }
> = {
  1: {
    assignedWorker: 'Worker 1 (Playwright project: worker-1)',
    batchSummary: 'Auth Setup + Login Component Batch 1 of 2 (10 files, 46 tests)',
    ownedTestSuites: [
      'auth.setup/auth.setup.ts (1 setup test)',
      'login/functional/business-logic.spec.ts (4 tests)',
      'login/functional/error-handling.spec.ts (4 tests)',
      'login/functional/negative.spec.ts (4 tests)',
      'login/functional/positive.spec.ts (4 tests)',
      'login/functional/validation.spec.ts (4 tests)',
      'login/security/injection-tampering.spec.ts (7 tests)',
      'login/security/rate-limiting.spec.ts (3 tests)',
      'login/resilience/login-resilience.spec.ts (3 tests)',
      'login/api/auth-contract.spec.ts (12 tests)',
    ],
  },
  2: {
    assignedWorker: 'Worker 2 (Playwright project: worker-2)',
    batchSummary: 'Login Component Batch 2 of 2 (8 files, 33 tests)',
    ownedTestSuites: [
      'login/ui-browser/accessibility.spec.ts (6 tests)',
      'login/ui-browser/keyboard-focus.spec.ts (3 tests)',
      'login/ui-browser/navigation.spec.ts (3 tests)',
      'login/ui-browser/responsiveness.spec.ts (3 tests)',
      'login/specialized/login-specialized.spec.ts (6 tests)',
      'login/visual/visual-regression.spec.ts (4 tests)',
      'login/mutation/login-mutation.spec.ts (3 tests)',
      'login/performance/login-performance.spec.ts (4 tests)',
    ],
  },
  3: {
    assignedWorker: 'Worker 3 (Playwright project: worker-3)',
    batchSummary: 'Tickets Component Batch 1 of 2 (7 files, 49 tests)',
    ownedTestSuites: [
      'tickets/functional/business-logic.spec.ts (9 tests)',
      'tickets/functional/error-handling.spec.ts (3 tests)',
      'tickets/functional/negative.spec.ts (4 tests)',
      'tickets/functional/positive.spec.ts (7 tests)',
      'tickets/functional/validation.spec.ts (5 tests)',
      'tickets/resilience/tickets-resilience.spec.ts (7 tests)',
      'tickets/api/ticket-contract.spec.ts (14 tests)',
    ],
  },
  4: {
    assignedWorker: 'Worker 4 (Playwright project: worker-4)',
    batchSummary: 'Tickets Component Batch 2 of 2 (11 files, 49 tests)',
    ownedTestSuites: [
      'tickets/ui-browser/accessibility.spec.ts (5 tests)',
      'tickets/ui-browser/keyboard-focus.spec.ts (3 tests)',
      'tickets/ui-browser/navigation.spec.ts (4 tests)',
      'tickets/ui-browser/responsiveness.spec.ts (3 tests)',
      'tickets/specialized/tickets-specialized.spec.ts (6 tests)',
      'tickets/security/admin-rbac.spec.ts (7 tests)',
      'tickets/security/idor-authorization.spec.ts (6 tests)',
      'tickets/security/injection-xss.spec.ts (3 tests)',
      'tickets/visual/visual-regression.spec.ts (5 tests)',
      'tickets/mutation/tickets-mutation.spec.ts (3 tests)',
      'tickets/performance/tickets-performance.spec.ts (4 tests)',
    ],
  },
  5: {
    assignedWorker: 'Worker 5 (Playwright project: worker-5)',
    batchSummary: 'Root E2E Journeys + Unassigned Catch-All (5 files, 5 tests + any new unassigned tests)',
    ownedTestSuites: [
      'e2e/user-lifecycle.spec.ts (1 test)',
      'e2e/multi-persona-collaboration.spec.ts (1 test)',
      'e2e/multi-tenant-isolation.spec.ts (1 test)',
      'e2e/login-journey.spec.ts (1 test)',
      'e2e/tickets-journey.spec.ts (1 test)',
      '[CATCH-ALL]: Any newly added .spec.ts file not preassigned to Workers 1-4',
    ],
  },
};

// [ASSIGNED WORKER: Worker 1] — Global authentication setup always runs on Worker 1
setup('authenticate all 5 deterministic worker users and save storageStates', async ({ request, baseURL }) => {
  // 1. Reset database to clean seeded baseline for all 5 workers
  const resetRes = await request.post('/api/test/reset?all=true');
  if (!resetRes.ok()) {
    const text = await resetRes.text();
    throw new Error(
      `Auth setup failed during DB reset (${resetRes.status()}): ${text}. ` +
      `Ensure the test server is booted with NODE_ENV=test.`
    );
  }

  // 2. Ensure storageState target directory exists and purge any legacy user.json / user-0.json files
  const authDir = '.auth';
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  } else {
    for (const legacyFile of ['.auth/user.json', '.auth/user-0.json']) {
      if (fs.existsSync(legacyFile)) {
        fs.unlinkSync(legacyFile);
      }
    }
  }

  // 3. Authenticate strictly Workers 1 through 5 concurrently in parallel
  const origin = baseURL || 'http://localhost:3100';
  const workers = Array.from({ length: NUM_WORKERS }, (_, i) => i + 1); // [1, 2, 3, 4, 5]

  await Promise.all(
    workers.map(async (w) => {
      const workerUser = getWorkerUser(w);
      const foreignUser = getForeignUser(w);
      const workerTickets = getWorkerTickets(w);
      const meta = WORKER_AUTH_FILE_METADATA[w];

      const loginRes = await request.post('/api/auth/login', {
        data: { email: workerUser.email, password: workerUser.password },
      });
      expect(loginRes.ok(), `Worker ${w} (${workerUser.email}) login failed with status ${loginRes.status()}`).toBe(true);
      const loginBody = await loginRes.json();
      expect(loginBody.token, `Worker ${w} (${workerUser.email}) did not receive a token`).toBeTruthy();
      const token = loginBody.token;

      const statePayload = JSON.stringify(
        {
          _comment: `StorageState for .auth/user-${w}.json — Owned by ${meta.assignedWorker}: ${meta.batchSummary}`,
          _mongodbMapping: {
            database: 'quicktix_test',
            authenticatedBotUserInDb: {
              _id: workerUser.id,
              email: workerUser.email,
              role: 'user',
              description: `Primary authenticated account stored in this .auth/user-${w}.json JWT token`,
            },
            ...(w === 5
              ? {
                  secondTenantUserInDb: {
                    _id: foreignUser.id,
                    email: foreignUser.email,
                    role: 'user',
                    description: 'Second live tenant account used by e2e/multi-tenant-isolation.spec.ts',
                  },
                }
              : {}),
            sharedGlobalAccountsInDb: {
              qaDemoUser: {
                _id: TEST_USERS.dev.id,
                email: TEST_USERS.dev.email,
                role: 'user',
              },
              systemAdmin: {
                _id: TEST_USERS.admin.id,
                email: TEST_USERS.admin.email,
                role: 'admin',
              },
            },
            seededTicketsInDb: [
              `${workerTickets.ticket1.id} (${workerTickets.ticket1.title} — owned by ${workerUser.email})`,
              `${workerTickets.ticket2.id} (${workerTickets.ticket2.title} — owned by ${workerUser.email})`,
              `${workerTickets.ticket3.id} (${workerTickets.ticket3.title} — owned by ${workerUser.email})`,
              `${workerTickets.ticket4.id} (${workerTickets.ticket4.title} — owned by ${workerUser.email})`,
              `${workerTickets.foreignTicket5.id} (${workerTickets.foreignTicket5.title} — owned by ${foreignUser.email})`,
            ],
            ownedTestSuites: meta.ownedTestSuites,
          },
          cookies: [],
          origins: [
            {
              origin,
              localStorage: [{ name: 'token', value: token }],
            },
          ],
        },
        null,
        2
      );

      fs.writeFileSync(`.auth/user-${w}.json`, statePayload, 'utf8');
    })
  );
});
