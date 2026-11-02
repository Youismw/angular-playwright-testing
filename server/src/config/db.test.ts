import { test, expect } from '@playwright/test';
import { resolveDatabaseUri, resolveDatabaseUris, mainDbConnection, closeDatabases } from './db.js';

test.describe('Database Isolation & URI Resolution', () => {

  test('should resolve unified main database and isolate dev vs test environments', () => {
    const originalEnv = process.env.NODE_ENV;

    process.env.NODE_ENV = 'development';
    const devUri = resolveDatabaseUri();
    const devDbName = new URL(devUri).pathname.replace(/^\//, '');
    expect(devDbName).toBe('quicktix_dev');

    process.env.NODE_ENV = 'test';
    const testUri = resolveDatabaseUri();
    const testDbName = new URL(testUri).pathname.replace(/^\//, '');
    expect(testDbName).toBe('quicktix_test');

    expect(devUri).not.toBe(testUri);
    process.env.NODE_ENV = originalEnv;
  });

  test('should ensure database name ends with _test in test environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    const testUri = resolveDatabaseUri();
    const testDbName = new URL(testUri).pathname.replace(/^\//, '');

    expect(testDbName.endsWith('_test')).toBe(true);

    process.env.NODE_ENV = originalEnv;
  });

  test('should prioritize explicit MONGO_URI when provided', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalMongoUri = process.env.MONGO_URI;

    process.env.NODE_ENV = 'test';
    process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/custom_unified_db_test';

    const resolvedUri = resolveDatabaseUri();
    expect(resolvedUri).toBe('mongodb://127.0.0.1:27017/custom_unified_db_test');

    if (originalMongoUri) process.env.MONGO_URI = originalMongoUri;
    else delete process.env.MONGO_URI;
    process.env.NODE_ENV = originalEnv;
  });

  test('should export mainDbConnection instance', () => {
    expect(mainDbConnection).toBeTruthy();
    expect(typeof mainDbConnection.model).toBe('function');
    expect(typeof mainDbConnection.close).toBe('function');
  });
});
