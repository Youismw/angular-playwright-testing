/**
 * ============================================================================
 * COMPONENT: Tickets Feature
 * FOLDER:    playwright/tickets/performance/
 * MODULE:    tickets-performance.spec.ts
 * TAXONOMY:  6. Performance, Web Vitals & High-Volume Rendering SLAs
 * ASSIGNED WORKER: Worker 4 (project: worker-4 | account: bot.worker4@quicktix.test)
 * WORKER BATCH:    Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Measures frontend rendering responsiveness and backend CRUD latency SLAs:
 *   1. Dashboard Initial Render Budget: Verifies `/tickets` loads and renders
 *      the ticket stream within performance thresholds.
 *   2. CRUD Endpoint Latency SLAs: Asserts `GET`, `POST`, `PUT`, and `DELETE`
 *      on `/api/tickets` each complete in < 200ms.
 *   3. High-Volume 100-Ticket DOM Rendering & Search Filtering: Injects a 100-ticket
 *      payload and verifies Angular renders all 100 cards and filters via live search
 *      in under 500ms.
 *   4. Static Asset & Network Hygiene: Confirms zero failed (`>= 400`) same-origin
 *      network requests during dashboard boot.
 * ============================================================================
 */

import { test, expect } from '../../fixtures/base.fixture.js';
import { TEST_USERS } from '../../fixtures/mock-data.js';

// [ASSIGNED WORKER: Worker 4] — Executed deterministically by Worker 4 (Tickets Batch 2 of 2 (tickets/ui-browser, tickets/specialized, tickets/security, tickets/visual, tickets/mutation, tickets/performance | ~201.4s total))
test.describe('Tickets Feature › Performance, Latency SLAs & High-Volume Rendering', () => {
  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Tickets dashboard loads and renders ticket stream within navigation timing budget',
    { tag: ['@performance', '@tickets'] },
    async ({ page }) => {
      const start = performance.now();
      await page.goto('/tickets');
      await expect(page.getByTestId('ticket-list')).toBeVisible();
      const totalRenderMs = performance.now() - start;

      const navTiming = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          ttfb: nav.responseStart - nav.requestStart,
          domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
        };
      });

      expect(navTiming.ttfb).toBeLessThan(300);
      expect(totalRenderMs).toBeLessThan(3000);
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Ticket CRUD API endpoints (GET, POST, PUT, DELETE) meet < 200ms latency SLAs',
    { tag: ['@performance', '@api', '@tickets'] },
    async ({ request }) => {
      const loginRes = await request.post('/api/auth/login', {
        data: { email: TEST_USERS.bot.email, password: TEST_USERS.bot.password },
      });
      expect(loginRes.ok(), `Login failed for bot: ${await loginRes.text()}`).toBe(true);
      const { token } = await loginRes.json();
      expect(token).toBeTruthy();
      const headers = { Authorization: `Bearer ${token}` };

      // 1. GET /api/tickets SLA
      const tGet = performance.now();
      const getRes = await request.get('/api/tickets', { headers });
      const getMs = performance.now() - tGet;
      expect(getRes.status()).toBe(200);
      expect(getMs).toBeLessThan(200);

      // 2. POST /api/tickets SLA
      const tPost = performance.now();
      const postRes = await request.post('/api/tickets', {
        headers,
        data: { title: 'SLA Benchmark Ticket', priority: 'Medium' },
      });
      const postMs = performance.now() - tPost;
      expect(postRes.status()).toBe(201);
      expect(postMs).toBeLessThan(200);
      const created = await postRes.json();

      // 3. PUT /api/tickets/:id SLA
      const tPut = performance.now();
      const putRes = await request.put(`/api/tickets/${created._id}`, {
        headers,
        data: { status: 'Resolved' },
      });
      const putMs = performance.now() - tPut;
      expect(putRes.status()).toBe(200);
      expect(putMs).toBeLessThan(200);

      // 4. DELETE /api/tickets/:id SLA
      const tDel = performance.now();
      const delRes = await request.delete(`/api/tickets/${created._id}`, { headers });
      const delMs = performance.now() - tDel;
      expect(delRes.status()).toBe(204);
      expect(delMs).toBeLessThan(200);
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'High-volume 100-ticket dataset renders rapidly and live search filters in < 500ms',
    { tag: ['@performance', '@tickets'] },
    async ({ page }) => {
      // Generate 100 synthetic tickets
      const bulkTickets = Array.from({ length: 100 }, (_, i) => ({
        _id: `200000000000000000000${i.toString().padStart(3, '0')}`,
        title: i === 77 ? 'Unique Needle In Haystack 77' : `Bulk Performance Ticket #${i + 1}`,
        description: `Synthetic load description for item ${i + 1}`,
        priority: (['Low', 'Medium', 'High', 'Urgent'] as const)[i % 4],
        status: (['Open', 'In Progress', 'Resolved', 'Closed'] as const)[i % 4],
        owner: TEST_USERS.bot.id,
        createdAt: new Date(Date.now() - i * 60000).toISOString(),
        updatedAt: new Date(Date.now() - i * 60000).toISOString(),
      }));

      await page.route('**/api/tickets*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(bulkTickets),
          });
        } else {
          await route.continue();
        }
      });

      const renderStart = performance.now();
      await page.goto('/tickets');
      await expect(page.getByTestId('ticket-row')).toHaveCount(100);
      const renderElapsed = performance.now() - renderStart;
      expect(renderElapsed).toBeLessThan(2500);

      // Measure live search filtering across 100 DOM nodes
      const searchStart = performance.now();
      await page.getByTestId('ticket-search').fill('Needle In Haystack 77');
      await expect(page.getByTestId('ticket-row')).toHaveCount(1);
      const searchElapsed = performance.now() - searchStart;
      expect(searchElapsed).toBeLessThan(500);
    }
  );

  // [Worker 4] Executed on preassigned Worker 4 (bot.worker4@quicktix.test)
  test(
    'Dashboard boot produces zero failed same-origin static asset or API requests',
    { tag: ['@performance', '@tickets'] },
    async ({ page }) => {
      const failedRequests: string[] = [];

      page.on('response', (response) => {
        const url = response.url();
        if ((url.includes('localhost') || url.includes('127.0.0.1')) && response.status() >= 400) {
          failedRequests.push(`${response.status()} ${url}`);
        }
      });

      await page.goto('/tickets');
      await expect(page.getByTestId('ticket-list')).toBeVisible();

      expect(failedRequests).toEqual([]);
    }
  );
});

