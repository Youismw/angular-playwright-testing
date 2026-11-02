/**
 * ============================================================================
 * FOLDER: server/src/
 * ============================================================================
 * Root directory for the QuickTix Express backend application.
 * Contains configuration, data models, custom middleware, API routes, and
 * the main HTTP application setup.
 *
 * ============================================================================
 * MODULE: server/src/index.ts (Application Entry Point & Lifecycle Controller)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * This is the executable entry point when you run `npm start` in the server folder.
 * It is responsible for orchestrating the server startup lifecycle:
 *   1. Loading environment variables from .env via dotenv.
 *   2. Validating environment configurations (e.g., JWT secret & production builds).
 *   3. Connecting to MongoDB via config/db.ts.
 *   4. Starting the Express HTTP server on the designated PORT (default 3000).
 *   5. Registering graceful shutdown listeners (SIGINT / SIGTERM) to close DB
 *      connections safely when the process stops.
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   - Step 1: User runs `npm start` (tsx src/index.ts).
 *   - Step 2: ES Module imports pull in `app.ts` (Express instance) and `config/db.ts`.
 *   - Step 3: dotenv checks if `../../.env` exists in the workspace root and injects
 *     variables like PORT, NODE_ENV, and Mongo URIs into `process.env`.
 *   - Step 4: `startServer()` executes. It calls `resolveDatabaseUri()` and
 *     `connectDatabases()` from `config/db.ts`. Mongoose establishes connection to:
 *       - MongoDB (port 27017, housing users & tickets collections)
 *   - Step 5: After DB connection resolves, `app.listen(PORT)` opens TCP port 3000.
 *   - Step 6: The server is now ready to receive incoming HTTP requests from the frontend
 *     or automated Playwright tests.
 *   - Step 7: On `Ctrl+C` (SIGINT), `gracefulShutdown` closes the HTTP server and calls
 *     `closeDatabases()` to avoid dangling sockets or corrupted MongoDB sessions.
 * ============================================================================
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { app, clientDist } from './app.js';
import {
  connectDatabases,
  closeDatabases,
  resolveDatabaseUri,
  mainDbConnection,
} from './config/db.js';

// Resolve directory paths in ES Module environment (__dirname is not native in ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------------------------------------------------------------------
// 1. Environment Variable Initialization
// ----------------------------------------------------------------------------
// Hypothetical run: In this monorepo, .env is located at the repository root.
// We resolve '../../.env' from 'server/src/'. If found, dotenv parses it into
// process.env; otherwise, fallback to server-local .env or system environment.
const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

// Extract server port and execution environment mode (development | test | production)
const parsedPort = Number(process.env.PORT);
const PORT = !isNaN(parsedPort) && parsedPort > 0 ? parsedPort : 3000;
const NODE_ENV = (process.env.NODE_ENV || 'development').trim().toLowerCase();

// ----------------------------------------------------------------------------
// 2. Production Safety Invariants & Guardrails
// ----------------------------------------------------------------------------
// In production mode, crash immediately if insecure default secrets are detected
// or if the pre-built Angular frontend bundle (dist/index.html) is missing.
if (NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-only-secret-do-not-use-in-production') {
    console.error('FATAL: Insecure or default JWT_SECRET is prohibited in production mode.');
    process.exit(1);
  }

  const indexPath = path.join(clientDist, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error(`FATAL: Frontend build index.html not found at '${indexPath}'. Run client build first.`);
    process.exit(1);
  }
}

// ----------------------------------------------------------------------------
// 3. Asynchronous Server Bootstrap
// ----------------------------------------------------------------------------
async function startServer(): Promise<void> {
  try {
    // Determine database URI based on NODE_ENV (dev vs test database)
    const mainUri = resolveDatabaseUri();
    console.log(`Connecting to MongoDB Main DB at '${mainUri}'...`);

    // Await database connection promise before opening network port
    await connectDatabases();
    console.log(`MongoDB connected successfully [Database: '${mainDbConnection.name}']`);

    // Start listening on TCP port (e.g., 3000)
    const server = app.listen(PORT, () => {
      console.log(`QuickTix Server is running on http://localhost:${PORT} [NODE_ENV=${NODE_ENV}]`);
      if (['production', 'test'].includes(NODE_ENV)) {
        console.log(`Serving static files from: '${clientDist}'`);
      } else {
        console.log(`API mode only: client serving disabled on port ${PORT} (Angular served on http://localhost:4200)`);
      }
    });

    // --------------------------------------------------------------------------
    // 4. Graceful Shutdown Handlers
    // --------------------------------------------------------------------------
    // Intercept termination signals (e.g., Ctrl+C in terminal or SIGTERM in Docker/K8s).
    // Closes the HTTP server first to reject new traffic, then closes DB connections.
    const gracefulShutdown = async (signal: string) => {
      console.log(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await closeDatabases();
        console.log('MongoDB connections closed. Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (err) {
    console.error('FATAL: Failed to start server:', err);
    process.exit(1);
  }
}

// Execute the bootstrap sequence
startServer();
