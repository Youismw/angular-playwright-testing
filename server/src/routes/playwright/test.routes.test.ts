/**
 * Unit / Integration test for the Playwright support route: POST /api/test/reset
 * Note: Located alongside server/src/routes/playwright/test.routes.ts
 */
import { test, expect } from '@playwright/test';
import request from 'supertest';

process.env.NODE_ENV = 'test';
const { app } = await import('../../app.js');
const { connectDatabases, closeDatabases } = await import('../../config/db.js');

test.describe('Test Routes Integration Tests', () => {
  test.beforeAll(async () => {
    await connectDatabases();
  });



  test('should reset database and return seeded counts', async () => {
    const res = await request(app).post('/api/test/reset');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('reset_complete');
    expect(res.body.users.length).toBe(2);
    expect(res.body.tickets.length).toBe(5);
  });

  test('should handle concurrent reset calls safely without duplicate key collisions', async () => {
    const concurrentRequests = [
      request(app).post('/api/test/reset'),
      request(app).post('/api/test/reset'),
      request(app).post('/api/test/reset'),
    ];

    const responses = await Promise.all(concurrentRequests);
    for (const res of responses) {
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('reset_complete');
    }
  });
});
