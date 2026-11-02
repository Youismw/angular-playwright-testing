/**
 * ============================================================================
 * FOLDER: server/src/
 * ============================================================================
 * Root directory for the QuickTix Express backend application.
 *
 * ============================================================================
 * MODULE: server/src/app.ts (Express Application Configuration & Pipeline)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Creates and configures the Express application instance (`app`).
 * It establishes the request-processing pipeline in sequential order:
 *   1. Security Headers middleware (prevents MIME-sniffing, clickjacking, etc.).
 *   2. CORS middleware (validates frontend origins, e.g. localhost:4200).
 *   3. JSON body parsing middleware (express.json converts body to req.body).
 *   4. Route mounting:
 *      - `/api/auth`    -> auth.routes.ts (login, token generation)
 *      - `/api/tickets` -> ticket.routes.ts (ticket CRUD, JWT authenticated)
 *      - `/api`         -> health.routes.ts (DB connection checks)
 *      - `/api/test`    -> test.routes.ts (test state reset, test-only)
 *   5. Static Client Serving (production/test only, serves Angular dist).
 *   6. API 404 handler for unknown `/api/*` endpoints.
 *   7. Central Error Handling middleware (handles malformed JSON and internal 500s).
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   - Case 1: Frontend sends `POST /api/auth/login` with JSON payload:
 *     1. Request enters `app`.
 *     2. Security headers are injected into the response.
 *     3. CORS verifies origin `http://localhost:4200`.
 *     4. `express.json()` parses raw body into JavaScript object `req.body`.
 *     5. Matched to `/api/auth` -> forwarded to `authRouter`.
 *   - Case 2: Frontend sends `GET /api/tickets`:
 *     1. Passes security, CORS, and json parser.
 *     2. Matched to `/api/tickets` -> forwarded to `ticketRouter` (which runs `authenticateToken`).
 *   - Case 3: Invalid JSON payload sent:
 *     1. `express.json()` parser throws an `entity.parse.failed` error.
 *     2. Caught by the Central Error Handler at the bottom, returning HTTP 400 'Malformed JSON payload'.
 * ============================================================================
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authRouter } from './routes/auth.routes.js';
import { ticketRouter } from './routes/ticket.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { testRouter } from './routes/playwright/test.routes.js';
import { errorHandler } from './middleware/error.js';

// Resolve file paths for ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Exported Express instance consumed by server/src/index.ts and supertest integration tests
export const app = express();

// ----------------------------------------------------------------------------
// 1. Cross-Origin Resource Sharing (CORS) Configuration
// ----------------------------------------------------------------------------
// Hypothetical run: When the Angular client on http://localhost:4200 makes a request
// to port 3000, the browser sends an 'Origin' header. CORS ensures only trusted origins
// can read API responses, mitigating cross-site scripting vulnerabilities.
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : [
      'http://localhost:3000',
      'http://localhost:4200',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:4200',
    ];

const isTestEnv = (process.env.NODE_ENV || '').trim().toLowerCase() === 'test';

// ----------------------------------------------------------------------------
// 2. Standard HTTP Security Headers Middleware
// ----------------------------------------------------------------------------
// Injected on EVERY response before subsequent routing:
//   - nosniff: Stops browsers from guessing MIME types (prevents script injection).
//   - DENY: Stops the app from being embedded in an iframe (clickjacking protection).
//   - Referrer-Policy: Prevents leaking sensitive URL paths in Referer headers.
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like same-origin, curl, server-to-server, or test suites)
      if (!origin || allowedOrigins.includes(origin) || isTestEnv) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);

// ----------------------------------------------------------------------------
// 3. Request Body Parser Middleware
// ----------------------------------------------------------------------------
// Hypothetical run: Parses incoming Content-Type: application/json into JavaScript
// object on req.body so routes (like /api/auth/login) can access { email, password }.
app.use(express.json());

// ----------------------------------------------------------------------------
// 4. API Route Dispatching
// ----------------------------------------------------------------------------
// Mounts dedicated route modules:
app.use('/api/auth', authRouter);       // Login and token generation
app.use('/api/tickets', ticketRouter);   // Authenticated Ticket CRUD operations
app.use('/api', healthRouter);           // GET /api/health database connectivity check

// Test Reset endpoint: strictly registered only when NODE_ENV === 'test'
// Refuses to exist in production or development to prevent accidental data wipes.
if (isTestEnv) {
  app.use('/api/test', testRouter);
}

// ----------------------------------------------------------------------------
// 5. Angular Client Distribution Resolution & Static Serving
// ----------------------------------------------------------------------------
// Detects location of compiled Angular bundle.
const candidateDistPaths = [
  path.resolve(__dirname, '../../client/dist/client/browser'),
  path.resolve(__dirname, '../../client/dist/browser'),
];

export const clientDist = process.env.CLIENT_DIST
  ? path.resolve(process.env.CLIENT_DIST)
  : candidateDistPaths.find((p) => fs.existsSync(path.join(p, 'index.html'))) || candidateDistPaths[0];

// Serve static assets only in production or test environments
// In development, the client is served via Angular CLI on http://localhost:4200 with live reload.
const isProductionOrTest = ['production', 'test'].includes((process.env.NODE_ENV || '').trim().toLowerCase());
if (isProductionOrTest && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));

  // Express 5 compatible Single Page Application (SPA) catch-all middleware
  // If request is not an /api route, return index.html so Angular client-side router takes over.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    const indexPath = path.join(clientDist, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(indexPath);
    }
    next();
  });
}

// ----------------------------------------------------------------------------
// 6. Fallthrough 404 for Unmatched /api Routes
// ----------------------------------------------------------------------------
// If a request starts with /api but didn't match any registered router above:
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'NotFound', message: 'API endpoint not found' });
});

// ----------------------------------------------------------------------------
// 7. Central Error Handling Middleware
// ----------------------------------------------------------------------------
// Catches domain CustomErrors, Mongoose exceptions, and body-parsing exceptions across the app.
app.use(errorHandler);

