import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';
import { authenticateToken } from './auth.js';

test.describe('Auth Middleware Unit Tests', () => {
  const secret = process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-production';

  test('should return 401 when Authorization header is missing', () => {
    let statusCode = 0;
    let jsonBody: any = null;

    const req: any = { headers: {} };
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: any) {
        jsonBody = body;
        return this;
      },
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    authenticateToken(req, res, next);

    expect(statusCode).toBe(401);
    expect(jsonBody).toEqual({
      error: 'Unauthorized',
      message: 'Valid token required',
    });
    expect(nextCalled).toBe(false);
  });

  test('should return 401 when Authorization header is not Bearer format', () => {
    let statusCode = 0;
    let jsonBody: any = null;

    const req: any = { headers: { authorization: 'Basic 12345' } };
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: any) {
        jsonBody = body;
        return this;
      },
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    authenticateToken(req, res, next);

    expect(statusCode).toBe(401);
    expect(jsonBody).toEqual({
      error: 'Unauthorized',
      message: 'Valid token required',
    });
    expect(nextCalled).toBe(false);
  });

  test('should return 401 when token is invalid or expired', () => {
    let statusCode = 0;
    let jsonBody: any = null;

    const req: any = { headers: { authorization: 'Bearer invalid.token.value' } };
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: any) {
        jsonBody = body;
        return this;
      },
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    authenticateToken(req, res, next);

    expect(statusCode).toBe(401);
    expect(jsonBody).toEqual({
      error: 'Unauthorized',
      message: 'Valid token required',
    });
    expect(nextCalled).toBe(false);
  });

  test('should attach user payload to req and call next for valid JWT', () => {
    const payload = { id: '000000000000000000000001', email: 'qa.user@quicktix.test' };
    const validToken = jwt.sign(payload, secret, { expiresIn: '1h' });

    const req: any = { headers: { authorization: `Bearer ${validToken}` } };
    const res: any = {};
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    authenticateToken(req, res, next);

    expect(nextCalled).toBe(true);
    expect(req.user.id).toBe(payload.id);
    expect(req.user.email).toBe(payload.email);
  });

  test('should trim and accept Bearer token with extra spaces', () => {
    const payload = { id: '000000000000000000000001', email: 'qa.user@quicktix.test' };
    const validToken = jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '1h' });

    const req: any = { headers: { authorization: `Bearer   ${validToken}   ` } };
    const res: any = {};
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    authenticateToken(req, res, next);
    expect(nextCalled).toBe(true);
  });

  test('should reject tokens with unauthorized algorithms (e.g. none)', () => {
    // Construct unsigned/none algorithm token
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id: '1', email: 'none@test.com' })).toString('base64url');
    const noneToken = `${header}.${payload}.`;

    let statusCode = 0;
    const req: any = { headers: { authorization: `Bearer ${noneToken}` } };
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    authenticateToken(req, res, next);
    expect(statusCode).toBe(401);
    expect(nextCalled).toBe(false);
  });

  test('should reject tokens with malformed or non-ObjectId user id with 401', () => {
    const invalidIdPayload = { id: 'not-a-valid-object-id', email: 'test@quicktix.test' };
    const token = jwt.sign(invalidIdPayload, secret, { algorithm: 'HS256', expiresIn: '1h' });

    let statusCode = 0;
    let jsonBody: any = null;
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: any) {
        jsonBody = body;
        return this;
      },
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    authenticateToken(req, res, next);
    expect(statusCode).toBe(401);
    expect(jsonBody).toEqual({
      error: 'Unauthorized',
      message: 'Valid token required',
    });
    expect(nextCalled).toBe(false);
  });
});
