/**
 * ============================================================================
 * FOLDER: server/src/middleware/
 * ============================================================================
 * Middleware Layer: Contains reusable Express interceptor functions that execute
 * prior to route handlers to perform tasks like security checks, authentication,
 * logging, or request normalization.
 *
 * ============================================================================
 * MODULE: server/src/middleware/auth.ts (JWT Authentication Interceptor)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Inspects incoming HTTP requests for a valid JSON Web Token (JWT) in the
 * `Authorization: Bearer <token>` header. It cryptographically verifies the
 * signature and expiration using `jsonwebtoken`, attaches the authenticated
 * user identity (`id`, `email`) to `req.user`, and calls `next()`.
 *
 * COMMUNICATES WITH:
 *   - Consumed by `server/src/routes/ticket.routes.ts` via `router.use(authenticateToken)`,
 *     protecting all ticket CRUD endpoints.
 *   - Issues tokens verified here originate from `server/src/routes/auth.routes.ts`.
 *   - Tested thoroughly by `server/src/middleware/auth.test.ts`.
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   - Scenario A: Valid Authenticated Request:
 *     1. Angular client calls `GET /api/tickets` with `Authorization: Bearer eyJ...`.
 *     2. `authenticateToken` extracts token substring after 'Bearer '.
 *     3. `jwt.verify()` confirms HMAC-SHA256 signature and that token is not expired.
 *     4. `req.user = { id: '000000000000000000000001', email: 'qa.user@quicktix.test' }`.
 *     5. Calls `next()` to proceed into the ticket route handler.
 *   - Scenario B: Unauthenticated / Expired Request:
 *     1. Request arrives with missing or manipulated token.
 *     2. `jwt.verify()` throws an error or token is null.
 *     3. Execution halts immediately; returns `HTTP 401 Unauthorized` JSON.
 *     4. Downstream route handlers are never executed.
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { mainDbConnection } from '../config/db.js';
import { User } from '../models/User.js';

// Extend Express Request interface to carry decoded user credentials safely
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Express middleware to authenticate JSON Web Tokens and verify live database identity.
 */
export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  // 1. Extract Authorization header from HTTP request
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  // 2. Reject immediately if token is missing or not formatted as Bearer
  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid token required',
    });
    return;
  }

  const secret = process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-production';

  try {
    // 3. Cryptographically verify signature and algorithms to mitigate algorithm-confusion attacks
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as { id: string; email: string; role?: string };

    // 4. Validate that the payload contains a valid MongoDB ObjectId format
    if (!decoded || !decoded.id || !Types.ObjectId.isValid(decoded.id)) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid token required',
      });
      return;
    }

    // 5. Offline unit-test mode (when Mongoose connection is not active): attach decoded claims synchronously
    if (mainDbConnection.readyState !== 1) {
      req.user = { id: decoded.id, email: decoded.email, role: decoded.role || 'user' };
      next();
      return;
    }

    // 6. Live Database Verification: Confirm user still exists in MongoDB and email/role match live DB state.
    //    If a user's email or document is modified or deleted in MongoDB Compass, cached JWT tokens
    //    (such as .auth/user-1..5.json) must not bypass the database state.
    User.findById(decoded.id)
      .select('email role')
      .lean()
      .then((dbUser) => {
        const dbRole = dbUser?.role;
        const tokenRole = decoded.role !== undefined ? decoded.role : 'user';
        const isValidRole = dbRole === 'user' || dbRole === 'admin';
        if (!dbUser || dbUser.email !== decoded.email || !isValidRole || dbRole !== tokenRole) {
          res.status(401).json({
            error: 'Unauthorized',
            message: 'Valid token required',
          });
          return;
        }

        req.user = {
          id: decoded.id,
          email: dbUser.email,
          role: dbRole,
        };
        next();
      })
      .catch(() => {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid token required',
        });
      });
  } catch (err) {
    // 7. Token signature invalid, altered, or expired
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid token required',
    });
  }
}
