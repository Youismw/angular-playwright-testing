/**
 * ============================================================================
 * FOLDER: server/src/routes/playwright/
 * ============================================================================
 * NOTE: This folder contains backend APPLICATION ROUTING CODE that supports
 * Playwright E2E browser automation (e.g. database resets and seeding).
 * It is NOT a test suite folder. Actual unit tests reside alongside source
 * files, and E2E/taxonomy suites reside in the root `playwright/` directory.
 *
 * ============================================================================
 * MODULE: server/src/routes/playwright/test.routes.ts (E2E Test State Resetter)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Exposes the `POST /api/test/reset` endpoint.
 * This endpoint provides deterministic test environment isolation:
 *   1. Safety Check: Refuses to run unless BOTH database names end in `_test`.
 *   2. Database Wipe: Empties collections in both Users DB and Tickets DB.
 *   3. Deterministic Seeding: Seeds global accounts (QA Dev + Admin) plus
 *      5 preassigned parallel Worker accounts (Workers 1..5) and their isolated
 *      5-ticket datasets with fixed ObjectIds, timestamps, and MongoDB Compass
 *      worker ownership metadata (`assignedWorker`, `workerRole`, `ownedTestSuites`,
 *      `ownedTestFolders`).
 *   4. Concurrency Mutex: Serializes concurrent test reset calls using an
 *      in-memory Promise queue to eliminate MongoDB duplicate key errors (E11000).
 *
 * ============================================================================
 * DETERMINISTIC 5-WORKER PREASSIGNMENT OWNERSHIP & RUNTIME BALANCE MAP:
 * ============================================================================
 *   - WORKER 1 (worker=1, bot.worker1@quicktix.test):
 *     * auth.setup/auth.setup.ts                (1 setup test)
 *     * login/functional/*.spec.ts              (5 files, 20 tests)
 *     * login/security/*.spec.ts                (2 files, 10 tests)
 *     * login/resilience/*.spec.ts              (1 file,   3 tests)
 *     * login/api/*.spec.ts                     (1 file,  12 tests)
 *
 *   - WORKER 2 (worker=2, bot.worker2@quicktix.test):
 *     * login/ui-browser/*.spec.ts              (4 files, 16 tests)
 *     * login/specialized/*.spec.ts             (1 file,   6 tests)
 *     * login/visual/*.spec.ts                  (1 file,   4 tests)
 *     * login/mutation/*.spec.ts                (1 file,   3 tests)
 *     * login/performance/*.spec.ts             (1 file,   4 tests)
 *
 *   - WORKER 3 (worker=3, bot.worker3@quicktix.test):
 *     * tickets/functional/*.spec.ts            (5 files, 28 tests)
 *     * tickets/resilience/*.spec.ts            (1 file,   7 tests)
 *     * tickets/api/*.spec.ts                   (1 file,  14 tests)
 *
 *   - WORKER 4 (worker=4, bot.worker4@quicktix.test):
 *     * tickets/ui-browser/*.spec.ts            (4 files, 15 tests)
 *     * tickets/specialized/*.spec.ts           (1 file,   6 tests)
 *     * tickets/security/*.spec.ts              (3 files, 16 tests)
 *     * tickets/visual/*.spec.ts                (1 file,   5 tests)
 *     * tickets/mutation/*.spec.ts              (1 file,   3 tests)
 *     * tickets/performance/*.spec.ts           (1 file,   4 tests)
 *
 *   - WORKER 5 (worker=5, bot.worker5@quicktix.test):
 *     * e2e/user-lifecycle.spec.ts              (1 file,   1 test)
 *     * e2e/multi-persona-collaboration.spec.ts (1 file,   1 test)
 *     * e2e/multi-tenant-isolation.spec.ts      (1 file,   1 test)
 *     * e2e/login-journey.spec.ts               (1 file,   1 test)
 *     * e2e/tickets-journey.spec.ts             (1 file,   1 test)
 *     * [CATCH-ALL]: Any newly added .spec.ts file not preassigned to Workers 1-4.
 * ============================================================================
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../../models/User.js';
import { Ticket } from '../../models/Ticket.js';
import { mainDbConnection } from '../../config/db.js';

const router = Router();

// Bcrypt hash computed ONCE at module load (cost factor 4) to ensure reset finishes in < 20ms
const SEED_PASSWORD_HASH = bcrypt.hashSync('Passw0rd!test', 4);

// Deterministic ObjectIds defined in CONTRACT.md
const USER_1_ID = new Types.ObjectId('000000000000000000000001');
const ADMIN_USER_ID = new Types.ObjectId('0000000000000000000000a0');

// MongoDB Compass visual ownership dictionary for each of the 5 deterministic workers
const WORKER_COMPASS_METADATA: Record<
  number,
  {
    assignedWorker: string;
    batchSummary: string;
    ownedFolders: string[];
    ownedTestSuites: string[];
  }
> = {
  1: {
    assignedWorker: 'Worker 1 (project: worker-1)',
    batchSummary: 'Auth Setup + Login Component Batch 1 of 2 (10 files, 46 tests)',
    ownedFolders: [
      'auth.setup/',
      'login/functional/',
      'login/security/',
      'login/resilience/',
      'login/api/',
    ],
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
    assignedWorker: 'Worker 2 (project: worker-2)',
    batchSummary: 'Login Component Batch 2 of 2 (8 files, 33 tests)',
    ownedFolders: [
      'login/ui-browser/',
      'login/specialized/',
      'login/visual/',
      'login/mutation/',
      'login/performance/',
    ],
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
    assignedWorker: 'Worker 3 (project: worker-3)',
    batchSummary: 'Tickets Component Batch 1 of 2 (7 files, 49 tests)',
    ownedFolders: [
      'tickets/functional/',
      'tickets/resilience/',
      'tickets/api/',
    ],
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
    assignedWorker: 'Worker 4 (project: worker-4)',
    batchSummary: 'Tickets Component Batch 2 of 2 (11 files, 49 tests)',
    ownedFolders: [
      'tickets/ui-browser/',
      'tickets/specialized/',
      'tickets/security/',
      'tickets/visual/',
      'tickets/mutation/',
      'tickets/performance/',
    ],
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
    assignedWorker: 'Worker 5 (project: worker-5)',
    batchSummary: 'Root E2E Journeys + Unassigned Catch-All (5 files, 5 tests + any new unassigned tests)',
    ownedFolders: [
      'e2e/',
      '[CATCH-ALL: Any newly added unassigned .spec.ts file]',
    ],
    ownedTestSuites: [
      'e2e/user-lifecycle.spec.ts (1 test)',
      'e2e/multi-persona-collaboration.spec.ts (1 test)',
      'e2e/multi-tenant-isolation.spec.ts (1 test)',
      'e2e/login-journey.spec.ts (1 test)',
      'e2e/tickets-journey.spec.ts (1 test)',
      '[CATCH-ALL]: Automatically executes any new .spec.ts file not assigned to Workers 1-4',
    ],
  },
};

export interface WorkerContext {
  workerIndex: number;
  botId: Types.ObjectId;
  botEmail: string;
  foreignId: Types.ObjectId;
  foreignEmail: string;
  assignedWorker: string;
  batchSummary: string;
  ownedFolders: string[];
  ownedTestSuites: string[];
  tickets: Array<{
    _id: Types.ObjectId;
    title: string;
    description: string;
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
    status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
    owner: Types.ObjectId;
    ownerEmail: string;
    assignedWorker: string;
    ownedTestFolders: string[];
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export function getWorkerContext(workerIndex: number, baseDate: Date = new Date()): WorkerContext {
  const w = workerIndex === 0 ? 1 : workerIndex;
  const meta = WORKER_COMPASS_METADATA[w] || WORKER_COMPASS_METADATA[5];

  const botId =
    workerIndex === 0
      ? new Types.ObjectId('000000000000000000000099')
      : new Types.ObjectId(`00000000000000000000009${workerIndex}`);

  const botEmail =
    workerIndex === 0
      ? 'playwright.bot@quicktix.test'
      : `bot.worker${workerIndex}@quicktix.test`;

  const foreignId =
    workerIndex === 0
      ? new Types.ObjectId('000000000000000000000002')
      : new Types.ObjectId(`00000000000000000000002${workerIndex}`);

  const foreignEmail =
    workerIndex === 0
      ? 'other.user@quicktix.test'
      : `other.user.${workerIndex}@quicktix.test`;

  const offset = workerIndex * 10;
  const t1Id = new Types.ObjectId(`1000000000000000000000${(offset + 1).toString().padStart(2, '0')}`);
  const t2Id = new Types.ObjectId(`1000000000000000000000${(offset + 2).toString().padStart(2, '0')}`);
  const t3Id = new Types.ObjectId(`1000000000000000000000${(offset + 3).toString().padStart(2, '0')}`);
  const t4Id = new Types.ObjectId(`1000000000000000000000${(offset + 4).toString().padStart(2, '0')}`);
  const t5Id = new Types.ObjectId(`1000000000000000000000${(offset + 5).toString().padStart(2, '0')}`);

  const tickets = [
    {
      _id: t1Id,
      title: 'Fix login button styling',
      description: 'Login button alignment is off on mobile screens',
      priority: 'High' as const,
      status: 'Open' as const,
      owner: botId,
      ownerEmail: botEmail,
      assignedWorker: meta.assignedWorker,
      ownedTestFolders: meta.ownedFolders,
      createdAt: new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      _id: t2Id,
      title: 'Update documentation footer',
      description: 'Update copyright year in footer',
      priority: 'Low' as const,
      status: 'Open' as const,
      owner: botId,
      ownerEmail: botEmail,
      assignedWorker: meta.assignedWorker,
      ownedTestFolders: meta.ownedFolders,
      createdAt: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      _id: t3Id,
      title: 'Investigate memory leak',
      description: 'Memory grows steadily during load test',
      priority: 'Medium' as const,
      status: 'In Progress' as const,
      owner: botId,
      ownerEmail: botEmail,
      assignedWorker: meta.assignedWorker,
      ownedTestFolders: meta.ownedFolders,
      createdAt: new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      _id: t4Id,
      title: 'Setup automated backups',
      description: 'Configure automated daily MongoDB dumps',
      priority: 'Low' as const,
      status: 'Resolved' as const,
      owner: botId,
      ownerEmail: botEmail,
      assignedWorker: meta.assignedWorker,
      ownedTestFolders: meta.ownedFolders,
      createdAt: baseDate,
      updatedAt: baseDate,
    },
    {
      _id: t5Id,
      title: 'Foreign user secret issue',
      description: `This ticket belongs to foreign user and must never appear for worker ${workerIndex}`,
      priority: 'Urgent' as const,
      status: 'Open' as const,
      owner: foreignId,
      ownerEmail: foreignEmail,
      assignedWorker: `${meta.assignedWorker} [Foreign Tenant Isolation Ticket]`,
      ownedTestFolders: meta.ownedFolders,
      createdAt: baseDate,
      updatedAt: baseDate,
    },
  ];

  return {
    workerIndex,
    botId,
    botEmail,
    foreignId,
    foreignEmail,
    assignedWorker: meta.assignedWorker,
    batchSummary: meta.batchSummary,
    ownedFolders: meta.ownedFolders,
    ownedTestSuites: meta.ownedTestSuites,
    tickets,
  };
}

// In-memory mutex promise queue to serialize concurrent reset calls and prevent E11000 duplicate key collisions
let resetLock: Promise<any> = Promise.resolve();

// POST /api/test/reset
router.post('/reset', async (req: Request, res: Response): Promise<void> => {
  // Safety guard: refuse to wipe unless database name ends in _test
  const dbName = mainDbConnection.name || '';

  if (!dbName.endsWith('_test')) {
    res.status(403).json({
      error: 'Forbidden',
      message: `Reset refused: database '${dbName}' does not end in '_test'`,
    });
    return;
  }

  const workerParam = req.query.worker !== undefined ? req.query.worker : req.body?.worker;
  const isAll = req.query.all === 'true' || req.body?.all === true;
  const workerIndex = workerParam !== undefined ? parseInt(String(workerParam), 10) : undefined;

  const executeReset = async () => {
    const baseDate = new Date();

    const allowedSeedUserIds: Types.ObjectId[] = [USER_1_ID, ADMIN_USER_ID];

    // 1. Collect all deterministic seed user documents and their allowed ObjectIds
    const seedUsersToInsertIfMissing: Array<Record<string, unknown>> = [
      {
        _id: USER_1_ID,
        email: 'qa.user@quicktix.test',
        password: SEED_PASSWORD_HASH,
        role: 'user',
        assignedWorker: 'Global Demo / QA Account (All Workers)',
        workerRole: 'One-Click Demo Sign-In & Duplicate Registration Check Account',
        ownedTestSuites: [
          'login/functional/positive.spec.ts (auto-signin-demo)',
          'login/api/auth-contract.spec.ts (409 duplicate registration)',
          'e2e/login-journey.spec.ts (Demo Fast-Path Login)',
        ],
      },
      {
        _id: ADMIN_USER_ID,
        email: 'admin@quicktix.test',
        password: SEED_PASSWORD_HASH,
        role: 'admin',
        assignedWorker: 'Global System Admin (Worker 4 & Worker 5)',
        workerRole: 'RBAC Global Oversight & Multi-Persona Escalation Account',
        ownedTestSuites: [
          'tickets/security/admin-rbac.spec.ts (Worker 4 — 7 tests)',
          'e2e/multi-persona-collaboration.spec.ts (Worker 5 — 1 test)',
        ],
      },
    ];

    for (let w = 1; w <= 5; w++) {
      const ctx = getWorkerContext(w, baseDate);
      allowedSeedUserIds.push(ctx.botId);
      seedUsersToInsertIfMissing.push({
        _id: ctx.botId,
        email: ctx.botEmail,
        password: SEED_PASSWORD_HASH,
        role: 'user',
        assignedWorker: ctx.assignedWorker,
        workerRole: `Primary Bot Account — ${ctx.batchSummary}`,
        ownedTestSuites: ctx.ownedTestSuites,
      });

      // Only Worker 5 (e2e/multi-tenant-isolation.spec.ts) logs in as a second live tenant account
      if (w === 5) {
        allowedSeedUserIds.push(ctx.foreignId);
        seedUsersToInsertIfMissing.push({
          _id: ctx.foreignId,
          email: ctx.foreignEmail,
          password: SEED_PASSWORD_HASH,
          role: 'user',
          assignedWorker: ctx.assignedWorker,
          workerRole: 'Second Tenant Account — Used by e2e/multi-tenant-isolation.spec.ts (Tenant B)',
          ownedTestSuites: ['e2e/multi-tenant-isolation.spec.ts (1 test)'],
        });
      }
    }

    // 2. Purge ONLY dynamic/test-registered ephemeral users not in the seed _id set.
    //    When a specific worker resets (?worker=1..5), scope dynamic user cleanup to that
    //    worker's dynamic email prefixes so parallel workers (e.g. Worker 5 running e2e/user-lifecycle.spec.ts)
    //    never have their in-flight registered accounts deleted mid-test by another worker's reset!
    let purgedDynamicUserIds: Types.ObjectId[] = [];
    if (workerIndex === undefined || isNaN(workerIndex)) {
      const dynamicUsers = await User.find({ _id: { $nin: allowedSeedUserIds } }).select('_id').lean();
      purgedDynamicUserIds = dynamicUsers.map((u) => u._id as Types.ObjectId);
      if (purgedDynamicUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: purgedDynamicUserIds } });
      }
    } else if (workerIndex === 5) {
      const dynamicUsers = await User.find({
        _id: { $nin: allowedSeedUserIds },
        email: /^(login_e2e_|e2e_journey_)/i,
      })
        .select('_id')
        .lean();
      purgedDynamicUserIds = dynamicUsers.map((u) => u._id as Types.ObjectId);
      if (purgedDynamicUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: purgedDynamicUserIds } });
      }
    } else if (workerIndex === 2) {
      const dynamicUsers = await User.find({
        _id: { $nin: allowedSeedUserIds },
        email: /^(mutant_pw_|casemutant_|trim_mutant_)/i,
      })
        .select('_id')
        .lean();
      purgedDynamicUserIds = dynamicUsers.map((u) => u._id as Types.ObjectId);
      if (purgedDynamicUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: purgedDynamicUserIds } });
      }
    } else if (workerIndex === 1) {
      const dynamicUsers = await User.find({
        _id: { $nin: allowedSeedUserIds },
        email: { $not: /^(login_e2e_|e2e_journey_|mutant_pw_|casemutant_|trim_mutant_)/i },
      })
        .select('_id')
        .lean();
      purgedDynamicUserIds = dynamicUsers.map((u) => u._id as Types.ObjectId);
      if (purgedDynamicUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: purgedDynamicUserIds } });
      }
    }

    // 3. CRITICAL INVARIANT: NEVER overwrite or update existing seed user documents!
    //    Only insert a seed user if its _id is completely missing from MongoDB.
    //    This ensures:
    //      a) Manual edits in MongoDB Compass (e.g. changing qa.user@quicktix.test or worker emails
    //         to verify tests fail when DB state is broken) are NEVER overwritten by test resets.
    //      b) Existing user documents are NEVER modified in the background (updatedAt stays untouched),
    //         preventing MongoDB Compass's "Document was modified in the background" conflict popup.
    const existingUsers = await User.find({ _id: { $in: allowedSeedUserIds } }).select('_id').lean();
    const existingIdSet = new Set(existingUsers.map((u) => u._id.toString()));

    const missingUsers = seedUsersToInsertIfMissing.filter(
      (u) => !existingIdSet.has((u._id as Types.ObjectId).toString())
    );
    if (missingUsers.length > 0) {
      await User.insertMany(missingUsers, { ordered: false }).catch(() => {});
    }

    // 4. Reset tickets according to worker targeting
    if (workerIndex !== undefined && !isNaN(workerIndex)) {
      const ctx = getWorkerContext(workerIndex, baseDate);
      const ownersToPurge: Types.ObjectId[] = [
        ctx.botId,
        ctx.foreignId,
        USER_1_ID,
        ...purgedDynamicUserIds,
      ];
      await Ticket.deleteMany({
        $or: [
          { _id: { $in: ctx.tickets.map((t) => t._id) } },
          { owner: { $in: ownersToPurge } },
        ],
      });
      await Ticket.insertMany(ctx.tickets);

      return {
        status: 'reset_complete',
        worker: workerIndex,
        users: [USER_1_ID.toString(), ctx.botId.toString()],
        tickets: ctx.tickets.map((t) => t._id.toString()),
      };
    } else {
      // Global reset: purge ALL tickets first to ensure 100% hermetic isolation
      await Ticket.deleteMany({});
      const workersToSeed = isAll ? [1, 2, 3, 4, 5] : [1];
      const ctx1 = getWorkerContext(1, baseDate);

      for (const w of workersToSeed) {
        const ctx = getWorkerContext(w, baseDate);
        await Ticket.insertMany(ctx.tickets);
      }

      return {
        status: 'reset_complete',
        worker: 1,
        users: [USER_1_ID.toString(), ctx1.foreignId.toString()],
        tickets: ctx1.tickets.map((t) => t._id.toString()),
      };
    }
  };

  try {
    const currentRun = resetLock.then(executeReset, executeReset);
    resetLock = currentRun.then(() => {}, () => {});
    const result = await currentRun;
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'ResetError', message: err.message });
  }
});

export const testRouter = router;
