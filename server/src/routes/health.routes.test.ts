import { test, expect } from '@playwright/test';
import request from 'supertest';
import { app } from '../app.js';
import { connectDatabases, closeDatabases } from '../config/db.js';

test.describe('Health Routes Unit / Integration Tests', () => {

  test('should return 200 { status: "ok", mongo: "connected" } when databases are connected', async () => {
    await connectDatabases();

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', mongo: 'connected' });
  });
});
