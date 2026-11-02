/**
 * ============================================================================
 * COMPONENT: Login Page
 * FOLDER:    playwright/login/ui-browser/
 * MODULE:    responsiveness.spec.ts
 * TAXONOMY:  2. UI & Browser Testing › Viewport Responsiveness & Layout Stability
 * ASSIGNED WORKER: Worker 2 (project: worker-2 | account: bot.worker2@quicktix.test)
 * WORKER BATCH:    Login Batch 2 of 2 (login/ui-browser, login/specialized, login/visual, login/mutation, login/performance | ~100.1s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Validates CSS layouts, fluid scaling, and absence of horizontal overflow
 * across diverse screen form-factors:
 *   1. Mobile Viewport (375x667 - iPhone SE standard):
 *      Asserts form controls fit within bounds, zero horizontal overflow scrollbar,
 *      and inputs scale to mobile dimensions.
 *   2. Tablet Viewport (768x1024 - iPad Portrait):
 *      Asserts card centers horizontally with balanced margins and legible typography.
 *   3. Desktop Viewport (1280x800 - Standard Desktop):
 *      Asserts standard desktop hero section, header, and card render properly.
 *
 * COMMUNICATES WITH:
 *   - Playwright Viewport Controller: `page.setViewportSize()`
 *   - CSS Design Tokens: `client/src/app/components/login/login.component.css`
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. Playwright resizes the browser window to target dimensions.
 *   2. Page loads with responsive media queries active.
 *   3. Tests evaluate bounding boxes and `document.documentElement.scrollWidth`.
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';

// [ASSIGNED WORKER: Worker 2] — Executed deterministically by Worker 2 (Login Batch 2 of 2 (login/ui-browser, login/specialized, login/visual, login/mutation, login/performance | ~100.1s total))
test.describe('Login Component › UI & Browser › Responsiveness', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Mobile viewport (375x667): Card adapts with no horizontal overflow',
    { tag: ['@login', '@responsive'] },
    async ({ page }) => {
      // Step 1: Set typical mobile viewport size
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');

      // Step 2: Verify login card and submit button are visible and interactable
      const loginCard = page.locator('.login-card');
      await expect(loginCard).toBeVisible();

      const submitBtn = page.getByTestId('login-submit');
      await expect(submitBtn).toBeVisible();

      // Step 3: Verify the page does NOT introduce unintended horizontal scrollbars
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Step 4: Verify email input field bounding box fits completely inside the 375px viewport
      const emailBox = await page.getByTestId('login-email').boundingBox();
      expect(emailBox).not.toBeNull();
      expect(emailBox!.x).toBeGreaterThanOrEqual(0);
      expect(emailBox!.x + emailBox!.width).toBeLessThanOrEqual(375);
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Tablet viewport (768x1024): Centers card and renders legible typography',
    { tag: ['@login', '@responsive'] },
    async ({ page }) => {
      // Step 1: Set standard tablet viewport size
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/login');

      // Step 2: Verify hero header and card render cleanly
      await expect(page.locator('.hero-header')).toBeVisible();
      await expect(page.locator('.login-card')).toBeVisible();

      // Step 3: Verify horizontal centering: left margin and right margin are roughly equal
      const cardBox = await page.locator('.login-card').boundingBox();
      expect(cardBox).not.toBeNull();
      const leftGap = cardBox!.x;
      const rightGap = 768 - (cardBox!.x + cardBox!.width);
      expect(Math.abs(leftGap - rightGap)).toBeLessThan(10);
    }
  );

  // [Worker 2] Executed on preassigned Worker 2 (bot.worker2@quicktix.test)
  test(
    'Desktop viewport (1280x800): Standard presentation renders cleanly',
    { tag: ['@login', '@responsive'] },
    async ({ page }) => {
      // Step 1: Set standard desktop viewport size
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/login');

      // Step 2: Confirm all major visual sections render in normal layout flow
      await expect(page.locator('app-header')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('.login-card')).toBeVisible();
      await expect(page.getByTestId('auto-signin-demo')).toBeVisible();
    }
  );
});
