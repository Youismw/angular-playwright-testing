/**
 * ============================================================================
 * FOLDER: playwright/fixtures/
 * ============================================================================
 * Deterministic Multi-Worker Preassignment & Runtime Load-Balancing Registry.
 *
 * ============================================================================
 * MODULE: playwright/fixtures/worker-map.ts (5-Worker Ownership & Routing Map)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Replaces random parallel worker assignment with a deterministic 5-Worker
 * preassignment architecture balanced by measured runtime while keeping all
 * spec files inside each category subfolder intact on a single worker:
 *
 * ----------------------------------------------------------------------------
 * WORKER 1: Auth Setup + Login Component (Batch 1 of 2)
 *   - Bot Account:      bot.worker1@quicktix.test (ID: 000000000000000000000091)
 *   - Foreign Account:  other.user.1@quicktix.test (ID: 000000000000000000000021)
 *   - Storage State:    .auth/user-1.json
 *   - Measured Runtime: ~99.1s (+ ~14.0s auth.setup) | 9 spec files (45 tests)
 *   - Owned Folders & Spec Files:
 *       0. auth.setup/
 *          - auth.setup/auth.setup.ts (14.0s — 1 setup test)
 *       1. login/functional/ (65.9s — 5 files, 20 tests)
 *          - login/functional/business-logic.spec.ts
 *          - login/functional/error-handling.spec.ts
 *          - login/functional/negative.spec.ts
 *          - login/functional/positive.spec.ts
 *          - login/functional/validation.spec.ts
 *       2. login/security/ (22.6s — 2 files, 10 tests)
 *          - login/security/injection-tampering.spec.ts
 *          - login/security/rate-limiting.spec.ts
 *       3. login/resilience/ (10.0s — 1 file, 3 tests)
 *          - login/resilience/login-resilience.spec.ts
 *       4. login/api/ (0.6s — 1 file, 12 tests)
 *          - login/api/auth-contract.spec.ts
 *
 * ----------------------------------------------------------------------------
 * WORKER 2: Login Component (Batch 2 of 2)
 *   - Bot Account:      bot.worker2@quicktix.test (ID: 000000000000000000000092)
 *   - Foreign Account:  other.user.2@quicktix.test (ID: 000000000000000000000022)
 *   - Storage State:    .auth/user-2.json
 *   - Measured Runtime: ~100.1s | 8 spec files (33 tests)
 *   - Owned Folders & Spec Files:
 *       1. login/ui-browser/ (52.3s — 4 files, 16 tests)
 *          - login/ui-browser/accessibility.spec.ts
 *          - login/ui-browser/keyboard-focus.spec.ts
 *          - login/ui-browser/navigation.spec.ts
 *          - login/ui-browser/responsiveness.spec.ts
 *       2. login/specialized/ (20.3s — 1 file, 6 tests)
 *          - login/specialized/login-specialized.spec.ts
 *       3. login/visual/ (12.9s — 1 file, 4 tests)
 *          - login/visual/visual-regression.spec.ts
 *       4. login/mutation/ (7.6s — 1 file, 3 tests)
 *          - login/mutation/login-mutation.spec.ts
 *       5. login/performance/ (7.0s — 1 file, 4 tests)
 *          - login/performance/login-performance.spec.ts
 *
 * ----------------------------------------------------------------------------
 * WORKER 3: Tickets Component (Batch 1 of 2)
 *   - Bot Account:      bot.worker3@quicktix.test (ID: 000000000000000000000093)
 *   - Foreign Account:  other.user.3@quicktix.test (ID: 000000000000000000000023)
 *   - Storage State:    .auth/user-3.json
 *   - Measured Runtime: ~195.1s | 7 spec files (49 tests)
 *   - Owned Folders & Spec Files:
 *       1. tickets/functional/ (157.8s — 5 files, 28 tests)
 *          - tickets/functional/business-logic.spec.ts
 *          - tickets/functional/error-handling.spec.ts
 *          - tickets/functional/negative.spec.ts
 *          - tickets/functional/positive.spec.ts
 *          - tickets/functional/validation.spec.ts
 *       2. tickets/resilience/ (37.0s — 1 file, 7 tests)
 *          - tickets/resilience/tickets-resilience.spec.ts
 *       3. tickets/api/ (0.3s — 1 file, 14 tests)
 *          - tickets/api/ticket-contract.spec.ts
 *
 * ----------------------------------------------------------------------------
 * WORKER 4: Tickets Component (Batch 2 of 2)
 *   - Bot Account:      bot.worker4@quicktix.test (ID: 000000000000000000000094)
 *   - Foreign Account:  other.user.4@quicktix.test (ID: 000000000000000000000024)
 *   - Storage State:    .auth/user-4.json
 *   - Measured Runtime: ~201.4s | 11 spec files (49 tests)
 *   - Owned Folders & Spec Files:
 *       1. tickets/ui-browser/ (87.8s — 4 files, 15 tests)
 *          - tickets/ui-browser/accessibility.spec.ts
 *          - tickets/ui-browser/keyboard-focus.spec.ts
 *          - tickets/ui-browser/navigation.spec.ts
 *          - tickets/ui-browser/responsiveness.spec.ts
 *       2. tickets/specialized/ (30.3s — 1 file, 6 tests)
 *          - tickets/specialized/tickets-specialized.spec.ts
 *       3. tickets/security/ (27.9s — 3 files, 16 tests)
 *          - tickets/security/admin-rbac.spec.ts
 *          - tickets/security/idor-authorization.spec.ts
 *          - tickets/security/injection-xss.spec.ts
 *       4. tickets/visual/ (25.7s — 1 file, 5 tests)
 *          - tickets/visual/visual-regression.spec.ts
 *       5. tickets/mutation/ (14.9s — 1 file, 3 tests)
 *          - tickets/mutation/tickets-mutation.spec.ts
 *       6. tickets/performance/ (14.8s — 1 file, 4 tests)
 *          - tickets/performance/tickets-performance.spec.ts
 *
 * ----------------------------------------------------------------------------
 * WORKER 5: End-to-End (E2E) Journeys + Unassigned Test Catch-All
 *   - Bot Account:      bot.worker5@quicktix.test (ID: 000000000000000000000095)
 *   - Foreign Account:  other.user.5@quicktix.test (ID: 000000000000000000000025)
 *   - Storage State:    .auth/user-5.json
 *   - Measured Runtime: ~37.3s | 5 spec files (5 tests) + any future unassigned tests
 *   - Owned Folders & Spec Files:
 *       1. e2e/ (37.3s — 5 files, 5 tests)
 *          - e2e/user-lifecycle.spec.ts (6.8s)
 *          - e2e/multi-persona-collaboration.spec.ts (7.7s)
 *          - e2e/multi-tenant-isolation.spec.ts (7.3s)
 *          - e2e/login-journey.spec.ts (8.0s)
 *          - e2e/tickets-journey.spec.ts (7.5s)
 *       2. [CATCH-ALL FALLBACK]:
 *          - Any newly added `.spec.ts` file not matching Workers 1–4 is
 *            automatically routed to Worker 5.
 * ============================================================================
 */

export type AssignedWorkerId = 1 | 2 | 3 | 4 | 5;

/**
 * Setup project matcher (Always runs on Worker 1 before Workers 1-5 start)
 */
export const SETUP_MATCH: RegExp = /auth\.setup[\\/]auth\.setup\.ts/;

/**
 * WORKER 1 Matchers — Login Batch 1 (~99.1s total across 9 files, 45 tests)
 * Owns: login/functional, login/security, login/resilience, login/api
 */
export const WORKER_1_MATCH: RegExp[] = [
  /login[\\/]functional[\\/].*\.spec\.ts/,
  /login[\\/]security[\\/].*\.spec\.ts/,
  /login[\\/]resilience[\\/].*\.spec\.ts/,
  /login[\\/]api[\\/].*\.spec\.ts/,
];

/**
 * WORKER 2 Matchers — Login Batch 2 (~100.1s total across 8 files, 33 tests)
 * Owns: login/ui-browser, login/specialized, login/visual, login/mutation, login/performance
 */
export const WORKER_2_MATCH: RegExp[] = [
  /login[\\/]ui-browser[\\/].*\.spec\.ts/,
  /login[\\/]specialized[\\/].*\.spec\.ts/,
  /login[\\/]visual[\\/].*\.spec\.ts/,
  /login[\\/]mutation[\\/].*\.spec\.ts/,
  /login[\\/]performance[\\/].*\.spec\.ts/,
];

/**
 * WORKER 3 Matchers — Tickets Batch 1 (~195.1s total across 7 files, 49 tests)
 * Owns: tickets/functional, tickets/resilience, tickets/api
 */
export const WORKER_3_MATCH: RegExp[] = [
  /tickets[\\/]functional[\\/].*\.spec\.ts/,
  /tickets[\\/]resilience[\\/].*\.spec\.ts/,
  /tickets[\\/]api[\\/].*\.spec\.ts/,
];

/**
 * WORKER 4 Matchers — Tickets Batch 2 (~201.4s total across 11 files, 49 tests)
 * Owns: tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance
 */
export const WORKER_4_MATCH: RegExp[] = [
  /tickets[\\/]ui-browser[\\/].*\.spec\.ts/,
  /tickets[\\/]specialized[\\/].*\.spec\.ts/,
  /tickets[\\/]security[\\/].*\.spec\.ts/,
  /tickets[\\/]visual[\\/].*\.spec\.ts/,
  /tickets[\\/]mutation[\\/].*\.spec\.ts/,
  /tickets[\\/]performance[\\/].*\.spec\.ts/,
];

/**
 * Exclusion list for WORKER 5 (`testIgnore`).
 * By ignoring `auth.setup` and all folders explicitly owned by Workers 1–4,
 * Worker 5 automatically owns `e2e/*.spec.ts` (~37.3s) AND acts as the
 * catch-all worker for any newly added `.spec.ts` file without a worker assignment.
 */
export const WORKER_5_IGNORE: RegExp[] = [
  SETUP_MATCH,
  ...WORKER_1_MATCH,
  ...WORKER_2_MATCH,
  ...WORKER_3_MATCH,
  ...WORKER_4_MATCH,
];

/**
 * Resolves the deterministic preassigned Worker ID (1..5) for any test file path.
 * Any unrecognized or newly added test file defaults to Worker 5.
 */
export function resolveAssignedWorker(filePath: string): AssignedWorkerId {
  const normalized = filePath.replace(/\\/g, '/');

  if (SETUP_MATCH.test(normalized) || WORKER_1_MATCH.some((rx) => rx.test(normalized))) {
    return 1;
  }
  if (WORKER_2_MATCH.some((rx) => rx.test(normalized))) {
    return 2;
  }
  if (WORKER_3_MATCH.some((rx) => rx.test(normalized))) {
    return 3;
  }
  if (WORKER_4_MATCH.some((rx) => rx.test(normalized))) {
    return 4;
  }

  // Default / Catch-All: e2e/*.spec.ts and any new unassigned test files run on Worker 5
  return 5;
}

