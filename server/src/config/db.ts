/**
 * ============================================================================
 * FOLDER: server/src/config/
 * ============================================================================
 * Configuration directory containing environment configurations and database
 * connection management logic for the backend.
 *
 * ============================================================================
 * MODULE: server/src/config/db.ts (Unified MongoDB Connection Manager)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Establishes and manages ONE connection to MongoDB, housing two isolated databases:
 *   1. Main / Dev Database (default: mongodb://localhost:27017/quicktix_dev)
 *   2. Test Database       (default: mongodb://localhost:27017/quicktix_test)
 *
 * Inside the active database, data is organized into two distinct collections
 * (subcategories):
 *   - 'users'   (User accounts, credentials, and roles)
 *   - 'tickets' (Support tickets, status, and priorities)
 *
 * ARCHITECTURAL PURPOSE:
 * Maintains strict isolation between development/production and test environments
 * while consolidating connections onto a single connection pool (`mainDbConnection`).
 * Both `User` and `Ticket` models bind directly to `mainDbConnection`.
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. Called by `server/src/index.ts` during startup.
 *   2. `resolveDatabaseUri()` inspects `NODE_ENV`:
 *      - If 'test', connects to 'quicktix_test'.
 *      - If 'development', connects to 'quicktix_dev'.
 *   3. `mongoose.createConnection(mainUri)` creates `mainDbConnection`.
 *   4. `server/src/models/User.ts` compiles `User` model on `mainDbConnection`.
 *   5. `server/src/models/Ticket.ts` compiles `Ticket` model on `mainDbConnection`.
 *   6. `connectDatabases()` waits for the socket to establish before Express opens port 3000.
 * ============================================================================
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose, { Connection } from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure environment variables are loaded if db.ts is executed directly in test runners
const rootEnv = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

/**
 * Resolves the MongoDB connection URI based on the current environment.
 * Ensures strict database isolation between development and test environments:
 *   - Development (default): connects to the main database (e.g., 'quicktix_dev')
 *   - Test (NODE_ENV=test): connects to the isolated test database (e.g., 'quicktix_test')
 */
export function resolveDatabaseUri(): string {
  const currentEnv = (process.env.NODE_ENV || 'development').trim().toLowerCase();
  const isTest = currentEnv === 'test';
  const defaultHost = process.env.MONGO_HOST || 'mongodb://localhost:27017';
  const defaultDbName = isTest ? 'quicktix_test' : 'quicktix_dev';

  let uri = process.env.MONGO_URI || process.env.MONGO_MAIN_URI || process.env.MONGO_USERS_URI;

  if (uri) {
    // Guarantee test database isolation: if running tests, ensure db name ends with _test
    if (isTest) {
      if (uri.endsWith('_dev')) {
        uri = uri.replace(/_dev$/, '_test');
      } else if (!uri.includes('_test')) {
        try {
          const parsed = new URL(uri);
          const currentDb = parsed.pathname.replace(/^\//, '');
          parsed.pathname = `/${currentDb ? `${currentDb.replace(/(_dev)?$/, '')}_test` : defaultDbName}`;
          uri = parsed.toString();
        } catch {
          uri = `${defaultHost}/${defaultDbName}`;
        }
      }
    }
  } else {
    uri = `${defaultHost}/${defaultDbName}`;
  }

  return uri;
}

/**
 * Helper returning URIs object for backward compatibility with existing tests.
 */
export function resolveDatabaseUris(): { mainUri: string; usersUri: string; ticketsUri: string } {
  const mainUri = resolveDatabaseUri();
  return { mainUri, usersUri: mainUri, ticketsUri: mainUri };
}

// Single Mongoose Connection instance for the application (connected via connectDatabases)
export const mainDbConnection: Connection = mongoose.createConnection();

/**
 * Connects the database.
 * Returns a promise that resolves only when the MongoDB socket is ready.
 *
 * Communicates with:
 *   - Called by `server/src/index.ts` during server startup.
 *   - Queried by `server/src/routes/health.routes.ts` to check `readyState === 1`.
 */
export async function connectDatabases(): Promise<{ mainDb: Connection }> {
  const activeUri = resolveDatabaseUri();
  if (mainDbConnection.readyState !== 1 && mainDbConnection.readyState !== 2) {
    mainDbConnection.openUri(activeUri);
  }
  await mainDbConnection.asPromise();
  return { mainDb: mainDbConnection };
}

/**
 * Closes the database connection gracefully.
 * Called during SIGINT/SIGTERM shutdown in `index.ts` or after automated test runs.
 */
export async function closeDatabases(): Promise<void> {
  await mainDbConnection.close();
}
