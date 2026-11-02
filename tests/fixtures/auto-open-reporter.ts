/**
 * ============================================================================
 * MODULE: playwright/fixtures/auto-open-reporter.ts
 * ============================================================================
 * Automatically opens `playwright-report/index.html` in the default system
 * browser upon test suite completion (unless `CI=1` or `NO_OPEN_REPORT=1`),
 * awaiting the OS shell handoff so Node does not exit before the browser opens.
 * ============================================================================
 */

import type { Reporter, FullResult } from '@playwright/test/reporter';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export default class AutoOpenHtmlReporter implements Reporter {
  async onEnd(_result: FullResult): Promise<void> {
    if (process.env.CI || process.env.NO_OPEN_REPORT === '1') {
      return;
    }

    const reportPath = path.resolve(process.cwd(), 'playwright-report', 'index.html');
    if (!fs.existsSync(reportPath)) {
      return;
    }

    await new Promise<void>((resolve) => {
      const cmd =
        process.platform === 'win32'
          ? `start "" "${reportPath}"`
          : process.platform === 'darwin'
          ? `open "${reportPath}"`
          : `xdg-open "${reportPath}"`;

      exec(cmd, () => {
        setTimeout(resolve, 400);
      });
    });
  }
}
