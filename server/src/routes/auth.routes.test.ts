process.env.NODE_ENV = 'test';
import { test, expect } from '@playwright/test';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

const { app } = await import('../app.js');
const { connectDatabases, closeDatabases, mainDbConnection } = await import('../config/db.js');
const { User } = await import('../models/User.js');

test.describe('Auth Routes Unit Tests', () => {
  const secret = process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-production';
  const testUserId = new Types.ObjectId('000000000000000000000001');
  const testEmail = 'qa.user@quicktix.test';
  const testPassword = 'Passw0rd!test';

  test.beforeAll(async () => {
    await connectDatabases();
    // CRITICAL GUARD: Refuse to execute or delete records unless connected to a test database
    if (!mainDbConnection.name || !mainDbConnection.name.endsWith('_test')) {
      throw new Error(`CRITICAL GUARD: Refusing to modify non-test database: '${mainDbConnection.name}'`);
    }
    // Clean up only the ephemeral registration email used by this suite; never wipe baseline seed users
    await User.deleteMany({ email: 'new.registered.user@quicktix.test' });
    const existing = await User.findById(testUserId).lean();
    if (!existing) {
      await User.create({
        _id: testUserId,
        email: testEmail,
        password: bcrypt.hashSync(testPassword, 4),
        role: 'user',
      });
    }
  });

  test.afterAll(async () => {
    await User.deleteMany({ email: 'new.registered.user@quicktix.test' });
  });


  test('should return 401 when email or password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: '' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
    expect(res.body.message).toBe('Invalid email or password');
  });

  test('should return 401 when password does not match', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  test('should reject credential typos and backdoor variants with 401', async () => {
    const res1 = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'Password!test' });
    expect(res1.status).toBe(401);

    const res2 = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'passw0rd!test' });
    expect(res2.status).toBe(401);
  });

  test('should return 401 when user does not exist (with constant-time dummy hash comparison)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@quicktix.test', password: testPassword });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  test('should return 200, valid JWT token with HS256 algorithm and rate-limit headers', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();

    const decoded: any = jwt.verify(res.body.token, secret, { algorithms: ['HS256'] });
    expect(decoded.id).toBe(testUserId.toString());
    expect(decoded.email).toBe(testEmail);

    const decodedComplete: any = jwt.decode(res.body.token, { complete: true });
    expect(decodedComplete?.header?.alg).toBe('HS256');

    // Rate-limit headers present
    expect(res.headers['ratelimit-limit']).toBeTruthy();
  });

  test('should successfully register a new user and return 201 with JWT', async () => {
    const newEmail = 'new.registered.user@quicktix.test';
    const newPass = 'ValidPass123!';

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: newEmail, password: newPass });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.message).toBe('Account created successfully');

    const decoded: any = jwt.verify(res.body.token, secret, { algorithms: ['HS256'] });
    expect(decoded.email).toBe(newEmail);

    // Verify user can now log in
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: newEmail, password: newPass });
    expect(loginRes.status).toBe(200);
  });

  test('should reject registration with existing email with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: 'AnotherPass123!' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Conflict');
  });

  test('should reject registration with invalid email or short password with 400', async () => {
    const resShort = await request(app)
      .post('/api/auth/register')
      .send({ email: 'valid@quicktix.test', password: '123' });
    expect(resShort.status).toBe(400);

    const resBadEmail = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'ValidPassword123' });
    expect(resBadEmail.status).toBe(400);
  });
});
