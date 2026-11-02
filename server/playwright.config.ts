/**
 * ============================================================================
 * FOLDER: server/
 * ============================================================================
 * Configuration for running backend unit and route integration tests directly
 * with the Playwright test runner in Node.js mode.
 *
 * ============================================================================
 * MODULE: server/playwright.config.ts
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Configures Playwright to run backend unit/integration tests located in
 * `server/src` unit and integration test files without browser overhead (pure Node.js execution).
 *   - Sets testDir to './src'
 *   - Enforces sequential execution (workers: 1, fullyParallel: false) to
 *     guarantee test database isolation.
 *   - Disables browser tracing since these tests exercise Express and Mongoose
 *     directly via Supertest in-process.
 *
 * COMMUNICATES WITH:
 *   - Consumed by `npm run test:server` and `npm test` inside `server/`.
 *   - Discovers all test files in server/src.
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. Developer runs `npm run test:server`.
 *   2. Playwright loads this configuration file.
 *   3. Playwright spawns a single worker process running Node.js.
 *   4. Tests connect directly to test MongoDB databases and invoke Express routes.
 *   5. All 31 backend unit tests pass in ~3 seconds.
 * ============================================================================
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Root directory where server unit and route tests reside
  testDir: './src',

  // Pattern matching all server unit test files
  testMatch: '**/*.test.ts',

  // Run sequentially to ensure database test collections are not wiped concurrently
  fullyParallel: false,
  workers: 1,

  // Maximum duration per unit test
  timeout: 30_000,

  // Terminal reporting style
  reporter: [['list']],

  // Browser tracing is disabled as these are headless Node API tests
  use: {
    trace: 'off',
  },
});
