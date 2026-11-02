/**
 * ============================================================================
 * FOLDER: server/src/routes/
 * ============================================================================
 * Routing Layer: Defines HTTP endpoints, attaches endpoint-specific middleware,
 * executes controller business logic, and serializes JSON responses.
 *
 * ============================================================================
 * MODULE: server/src/routes/health.routes.ts (Liveness & Database Probe)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Exposes an unauthenticated endpoint: `GET /api/health`.
 * Inspects the socket connectivity (`readyState === 1`) of the Mongoose database
 * connection:
 *   - `mainDbConnection` (MongoDB on port 27017)
 *
 * COMMUNICATES WITH:
 *   - Mounted by `server/src/app.ts` under prefix `/api` -> `/api/health`.
 *   - `server/src/config/db.ts`: Inspects connection objects.
 *   - `playwright.config.ts`: Polled by Playwright's `webServer` before running E2E tests.
 *   - Cloud load balancers / Docker compose healthchecks for liveness probes.
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. Playwright CLI starts `npm start --prefix server`.
 *   2. Playwright sends HTTP GET to `http://localhost:3000/api/health`.
 *   3. If both MongoDB clusters are connected (`readyState === 1`):
 *      - Responds with `HTTP 200 { status: 'ok', mongo: 'connected' }`.
 *      - Playwright detects readiness and launches the browser test suite.
 *   4. If MongoDB is starting or disconnected:
 *      - Responds with `HTTP 503 { status: 'error', mongo: 'disconnected' }`.
 * ============================================================================
 */

import { Router, Request, Response } from 'express';
import { mainDbConnection } from '../config/db.js';

const router = Router();

// GET /api/health
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const isMainDbConnected = mainDbConnection.readyState === 1;

  if (isMainDbConnected) {
    try {
      // Actively ping MongoDB connection to ensure server is actively responding
      await mainDbConnection.db?.admin().ping();
      res.status(200).json({ status: 'ok', mongo: 'connected' });
      return;
    } catch {
      // Fall through to 503 if ping failed
    }
  }

  res.status(503).json({
    status: 'error',
    mongo: 'disconnected',
    details: {
      mainDb: isMainDbConnected ? 'connected' : 'disconnected',
    },
  });
});

export const healthRouter = router;
