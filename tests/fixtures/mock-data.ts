/**
 * ============================================================================
 * FOLDER: playwright/fixtures/
 * ============================================================================
 * Shared test fixtures, deterministic constants, and seeded entities.
 *
 * ============================================================================
 * MODULE: playwright/fixtures/mock-data.ts (Seeded Entity Constants)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Exports dynamic, deterministic worker-aware data dictionaries:
 *   - Pre-seeded user accounts: Playwright Bot (scoped to Assigned Worker 1..5),
 *     QA/Developer (`qa.user@quicktix.test`), System Admin (`admin@quicktix.test`),
 *     and Foreign User (scoped to Assigned Worker 1..5).
 *   - Pre-seeded tickets with known ObjectIds, statuses, priorities, and owners.
 *
 * ============================================================================
 * DETERMINISTIC 5-WORKER INITIALIZATION & OWNERSHIP MAP:
 * ============================================================================
 *   - WORKER 1 (w = 1 | bot.worker1@quicktix.test | Tickets 10..15 | ~99.1s):
 *     * auth.setup/auth.setup.ts (14.0s)
 *     * login/functional/ (business-logic, error-handling, negative, positive, validation — 65.9s)
 *     * login/security/ (injection-tampering, rate-limiting — 22.6s)
 *     * login/resilience/ (login-resilience — 10.0s)
 *     * login/api/ (auth-contract — 0.6s)
 *
 *   - WORKER 2 (w = 2 | bot.worker2@quicktix.test | Tickets 20..25 | ~100.1s):
 *     * login/ui-browser/ (accessibility, keyboard-focus, navigation, responsiveness — 52.3s)
 *     * login/specialized/ (login-specialized — 20.3s)
 *     * login/visual/ (visual-regression — 12.9s)
 *     * login/mutation/ (login-mutation — 7.6s)
 *     * login/performance/ (login-performance — 7.0s)
 *
 *   - WORKER 3 (w = 3 | bot.worker3@quicktix.test | Tickets 30..35 | ~195.1s):
 *     * tickets/functional/ (business-logic, error-handling, negative, positive, validation — 157.8s)
 *     * tickets/resilience/ (tickets-resilience — 37.0s)
 *     * tickets/api/ (ticket-contract — 0.3s)
 *
 *   - WORKER 4 (w = 4 | bot.worker4@quicktix.test | Tickets 40..45 | ~201.4s):
 *     * tickets/ui-browser/ (accessibility, keyboard-focus, navigation, responsiveness — 87.8s)
 *     * tickets/specialized/ (tickets-specialized — 30.3s)
 *     * tickets/security/ (admin-rbac, idor-authorization, injection-xss — 27.9s)
 *     * tickets/visual/ (visual-regression — 25.7s)
 *     * tickets/mutation/ (tickets-mutation — 14.9s)
 *     * tickets/performance/ (tickets-performance — 14.8s)
 *
 *   - WORKER 5 (w = 5 | bot.worker5@quicktix.test | Tickets 50..55 | ~37.3s + Catch-All):
 *     * e2e/ (user-lifecycle, multi-persona-collaboration, multi-tenant-isolation,
 *             login-journey, tickets-journey — 37.3s)
 *     * [CATCH-ALL]: Any newly added .spec.ts file not preassigned to Workers 1–4.
 * ============================================================================
 */

import { resolveAssignedWorker } from './worker-map.js';

function getCurrentWorkerIndex(): number {
  // 1. Primary: Deterministic worker ID (1..5) set by base.fixture.ts for the active test
  const assignedEnv = process.env.ASSIGNED_WORKER_INDEX;
  if (assignedEnv) {
    const parsed = parseInt(assignedEnv, 10);
    if (!isNaN(parsed)) return parsed;
  }

  // 2. Secondary: If evaluated at module load / test.describe registration time,
  //    inspect the call stack to resolve the preassigned worker (1..5) from the spec file path
  const stack = new Error().stack || '';
  const specMatch = stack.match(/([^\r\n()]+?\.(?:spec|setup)\.ts)/i);
  if (specMatch && specMatch[1]) {
    return resolveAssignedWorker(specMatch[1].trim());
  }

  // 3. Fallback: Default to Worker 5 (catch-all worker)
  return 5;
}

export function getWorkerUser(w: number = getCurrentWorkerIndex()) {
  const id = w === 0 ? '000000000000000000000099' : `00000000000000000000009${w}`;
  const email = w === 0 ? 'playwright.bot@quicktix.test' : `bot.worker${w}@quicktix.test`;
  return {
    id,
    email,
    password: 'Passw0rd!test',
  };
}

export function getForeignUser(w: number = getCurrentWorkerIndex()) {
  const id = w === 0 ? '000000000000000000000002' : `00000000000000000000002${w}`;
  const email = w === 0 ? 'other.user@quicktix.test' : `other.user.${w}@quicktix.test`;
  return {
    id,
    email,
    password: 'Passw0rd!test',
  };
}

export function getWorkerTickets(w: number = getCurrentWorkerIndex()) {
  const offset = w * 10;
  return {
    ticket1: {
      id: `1000000000000000000000${(offset + 1).toString().padStart(2, '0')}`,
      title: 'Fix login button styling',
      status: 'Open',
      priority: 'High',
    },
    ticket2: {
      id: `1000000000000000000000${(offset + 2).toString().padStart(2, '0')}`,
      title: 'Update documentation footer',
      status: 'Open',
      priority: 'Low',
    },
    ticket3: {
      id: `1000000000000000000000${(offset + 3).toString().padStart(2, '0')}`,
      title: 'Investigate memory leak',
      status: 'In Progress',
      priority: 'Medium',
    },
    ticket4: {
      id: `1000000000000000000000${(offset + 4).toString().padStart(2, '0')}`,
      title: 'Setup automated backups',
      status: 'Resolved',
      priority: 'Low',
    },
    foreignTicket5: {
      id: `1000000000000000000000${(offset + 5).toString().padStart(2, '0')}`,
      title: 'Foreign user secret issue',
      status: 'Open',
      priority: 'Urgent',
    },
  };
}

export const TEST_USERS = {
  get bot() {
    return getWorkerUser();
  },
  dev: {
    id: '000000000000000000000001',
    email: 'qa.user@quicktix.test',
    password: 'Passw0rd!test',
  },
  admin: {
    id: '0000000000000000000000a0',
    email: 'admin@quicktix.test',
    password: 'Passw0rd!test',
    role: 'admin',
  },
  get other() {
    return getForeignUser();
  },
};

export const SEEDED_TICKETS = {
  get ticket1() { return getWorkerTickets().ticket1; },
  get ticket2() { return getWorkerTickets().ticket2; },
  get ticket3() { return getWorkerTickets().ticket3; },
  get ticket4() { return getWorkerTickets().ticket4; },
  get foreignTicket5() { return getWorkerTickets().foreignTicket5; },
};
