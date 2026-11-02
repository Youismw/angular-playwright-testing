/**
 * ============================================================================
 * MODULE: playwright.config.ts (Deterministic 5-Worker Preassignment Config)
 * ============================================================================
 * ARCHITECTURE OVERVIEW:
 * Configures 5 dedicated, non-random parallel workers (`workers: 5`) where
 * each worker project (`worker-1` through `worker-5`) is preassigned specific
 * component subfolders balanced by measured runtime (`fullyParallel: false`):
 *
 *   - WORKER 1 (`setup` + `worker-1`):
 *     * tests/auth.setup/auth.setup.ts
 *     * tests/login/functional/*.spec.ts
 *     * tests/login/security/*.spec.ts
 *     * tests/login/resilience/*.spec.ts
 *     * tests/login/api/*.spec.ts
 *
 *   - WORKER 2 (`worker-2`):
 *     * tests/login/ui-browser/*.spec.ts
 *     * tests/login/specialized/*.spec.ts
 *     * tests/login/visual/*.spec.ts
 *     * tests/login/mutation/*.spec.ts
 *     * tests/login/performance/*.spec.ts
 *
 *   - WORKER 3 (`worker-3`):
 *     * tests/tickets/functional/*.spec.ts
 *     * tests/tickets/resilience/*.spec.ts
 *     * tests/tickets/api/*.spec.ts
 *
 *   - WORKER 4 (`worker-4`):
 *     * tests/tickets/ui-browser/*.spec.ts
 *     * tests/tickets/specialized/*.spec.ts
 *     * tests/tickets/security/*.spec.ts
 *     * tests/tickets/visual/*.spec.ts
 *     * tests/tickets/mutation/*.spec.ts
 *     * tests/tickets/performance/*.spec.ts
 *
 *   - WORKER 5 (`worker-5`):
 *     * tests/e2e/user-lifecycle.spec.ts
 *     * tests/e2e/multi-persona-collaboration.spec.ts
 *     * tests/e2e/multi-tenant-isolation.spec.ts
 *     * tests/e2e/login-journey.spec.ts
 *     * tests/e2e/tickets-journey.spec.ts
 *     * [CATCH-ALL]: Any newly added .spec.ts not preassigned to Workers 1-4.
 * ============================================================================
 */

import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import {
  SETUP_MATCH,
  WORKER_1_MATCH,
  WORKER_2_MATCH,
  WORKER_3_MATCH,
  WORKER_4_MATCH,
  WORKER_5_IGNORE,
} from './tests/fixtures/worker-map.js';

dotenv.config();

// Prevent 'CI=false' from tricking Playwright into thinking it's on a headless CI server
if (process.env.CI === 'false') {
  delete process.env.CI;
}

const isCI = process.env.CI === 'true' || process.env.CI === '1';

const testPort = process.env.TEST_PORT || '3100';
const testBaseUrl = process.env.BASE_URL || `http://localhost:${testPort}`;

// Include optional cross-browser projects only when explicitly requested via --project
const includeCrossBrowser = process.argv.some((arg) =>
  /chromium|firefox|webkit|mobile-chrome/.test(arg)
);

// Skip redundant Angular build if dist bundle already exists (use FORCE_BUILD=true to rebuild)
const clientDist = path.resolve('client/dist/client/browser/index.html');
const clientDistAlt = path.resolve('client/dist/browser/index.html');
const clientDistExists = fs.existsSync(clientDist) || fs.existsSync(clientDistAlt);
const serverStartCommand =
  clientDistExists && process.env.FORCE_BUILD !== 'true'
    ? 'npm start --prefix server'
    : 'npm run build --prefix client && npm start --prefix server';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}-chromium{-snapshotSuffix}{ext}',
  workers: isCI ? 2 : 5,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'results/junit.xml' }],
    ['./tests/fixtures/auto-open-reporter.ts'],
  ],
  use: {
    baseURL: testBaseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: isCI ? 'retain-on-failure' : 'off',
  },
  webServer: process.env.NO_WEBSERVER ? undefined : {
    command: serverStartCommand,
    url: `${testBaseUrl}/api/health`,
    reuseExistingServer: !isCI,
    timeout: 60_000,
    env: {
      NODE_ENV: 'test',
      PORT: testPort,
      MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/quicktix_test',
      JWT_SECRET: process.env.JWT_SECRET || 'test-only-secret',
    },
  },
  projects: [
    {
      name: 'setup',
      testMatch: SETUP_MATCH,
      ...({ workers: 1 } as any),
    },
    {
      name: 'worker-1',
      testMatch: WORKER_1_MATCH,
      ...({ workers: 1 } as any),
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user-1.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'worker-2',
      testMatch: WORKER_2_MATCH,
      ...({ workers: 1 } as any),
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user-2.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'worker-3',
      testMatch: WORKER_3_MATCH,
      ...({ workers: 1 } as any),
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user-3.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'worker-4',
      testMatch: WORKER_4_MATCH,
      ...({ workers: 1 } as any),
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user-4.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'worker-5',
      testIgnore: WORKER_5_IGNORE,
      ...({ workers: 1 } as any),
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user-5.json',
      },
      dependencies: ['setup'],
    },
    ...(includeCrossBrowser
      ? [
          {
            name: 'chromium',
            use: {
              ...devices['Desktop Chrome'],
              storageState: '.auth/user-1.json',
            },
            dependencies: ['setup'],
          },
          {
            name: 'firefox',
            testIgnore: /visual/,
            use: {
              ...devices['Desktop Firefox'],
              storageState: '.auth/user-1.json',
            },
            dependencies: ['setup'],
          },
          {
            name: 'webkit',
            testIgnore: /visual/,
            use: {
              ...devices['Desktop Safari'],
              storageState: '.auth/user-1.json',
            },
            dependencies: ['setup'],
          },
          {
            name: 'mobile-chrome',
            testIgnore: /visual/,
            use: {
              ...devices['Pixel 7'],
              storageState: '.auth/user-1.json',
            },
            dependencies: ['setup'],
          },
        ]
      : []),
  ],
});

