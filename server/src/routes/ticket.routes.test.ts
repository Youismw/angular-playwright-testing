process.env.NODE_ENV = 'test';
import { test, expect } from '@playwright/test';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';

const { app } = await import('../app.js');
const { connectDatabases, closeDatabases, mainDbConnection } = await import('../config/db.js');
const { Ticket } = await import('../models/Ticket.js');
const { User } = await import('../models/User.js');

test.describe('Ticket Routes Unit Tests', () => {
  const secret = process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-production';
  const user1Id = new Types.ObjectId('000000000000000000000001');
  const user2Id = new Types.ObjectId('000000000000000000000025');

  const tokenUser1 = jwt.sign(
    { id: user1Id.toString(), email: 'qa.user@quicktix.test' },
    secret,
    { expiresIn: '2h' }
  );
  const tokenUser2 = jwt.sign(
    { id: user2Id.toString(), email: 'other.user.5@quicktix.test' },
    secret,
    { expiresIn: '2h' }
  );

  let user1TicketId = '';
  let user2TicketId = '';

  test.beforeAll(async () => {
    await connectDatabases();
    // CRITICAL GUARD: Refuse to execute or delete records unless connected to a test database
    if (!mainDbConnection.name || !mainDbConnection.name.endsWith('_test')) {
      throw new Error(`CRITICAL GUARD: Refusing to modify non-test database: '${mainDbConnection.name}'`);
    }

    // Ensure baseline seed users exist without overwriting existing records
    const existingU1 = await User.findById(user1Id).lean();
    if (!existingU1) {
      await User.create({
        _id: user1Id,
        email: 'qa.user@quicktix.test',
        password: bcrypt.hashSync('Passw0rd!test', 4),
        role: 'user',
      });
    }
    const existingU2 = await User.findById(user2Id).lean();
    if (!existingU2) {
      await User.create({
        _id: user2Id,
        email: 'other.user.5@quicktix.test',
        password: bcrypt.hashSync('Passw0rd!test', 4),
        role: 'user',
      });
    }

    await Ticket.deleteMany({ owner: { $in: [user1Id, user2Id] } });

    const t1 = await Ticket.create({
      title: 'Fix header layout bug',
      description: 'Alignment problem on desktop viewports',
      priority: 'High',
      status: 'Open',
      owner: user1Id,
    });
    user1TicketId = t1._id.toString();

    const t2 = await Ticket.create({
      title: 'Foreign secret ticket',
      description: 'Confidential ticket belonging to user 2',
      priority: 'Urgent',
      status: 'Open',
      owner: user2Id,
    });
    user2TicketId = t2._id.toString();
  });



  test('should reject unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/tickets');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  test('should list only tickets owned by authenticated user', async () => {
    const res = await request(app)
      .get('/api/tickets')
      .set('Authorization', `Bearer ${tokenUser1}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('Fix header layout bug');
  });

  test('should return 400 when invalid status filter query is provided', async () => {
    const res = await request(app)
      .get('/api/tickets?status=invalid_status_value')
      .set('Authorization', `Bearer ${tokenUser1}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
  });

  test('should validate title length on creation (< 3 characters)', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ title: 'ab', priority: 'High' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
    expect(res.body.message).toMatch(/Title must be between 3 and 100 characters/i);
  });

  test('should validate priority enum value', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ title: 'Valid Title Here', priority: 'InvalidPriority' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
  });

  test('should create a ticket with 201 status code on valid payload', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({
        title: 'New Feature Request',
        description: 'Detailed explanation of requirement',
        priority: 'Medium',
        status: 'Open',
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New Feature Request');
    expect(res.body.owner).toBe(user1Id.toString());
  });

  test('should isolate owners: User 1 fetching User 2 ticket returns 404', async () => {
    const res = await request(app)
      .get(`/api/tickets/${user2TicketId}`)
      .set('Authorization', `Bearer ${tokenUser1}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NotFound');
  });

  test('should isolate owners: User 1 deleting User 2 ticket returns 404', async () => {
    const res = await request(app)
      .delete(`/api/tickets/${user2TicketId}`)
      .set('Authorization', `Bearer ${tokenUser1}`);

    expect(res.status).toBe(404);
  });

  test('should update ticket status via PUT', async () => {
    const res = await request(app)
      .put(`/api/tickets/${user1TicketId}`)
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ status: 'Resolved' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Resolved');
  });

  test('should delete ticket via DELETE', async () => {
    const res = await request(app)
      .delete(`/api/tickets/${user1TicketId}`)
      .set('Authorization', `Bearer ${tokenUser1}`);

    expect(res.status).toBe(204);

    const checkRes = await request(app)
      .get(`/api/tickets/${user1TicketId}`)
      .set('Authorization', `Bearer ${tokenUser1}`);

    expect(checkRes.status).toBe(404);
  });
});
