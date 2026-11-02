/**
 * ============================================================================
 * FOLDER: server/src/routes/
 * ============================================================================
 * Routing Layer: Defines HTTP endpoints, attaches endpoint-specific middleware,
 * executes controller business logic, and serializes JSON responses.
 *
 * ============================================================================
 * MODULE: server/src/routes/auth.routes.ts (Authentication & Token Generator)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Exposes the `POST /login` authentication endpoint:
 *   1. Protects against brute-force password guessing via rate limiting.
 *   2. Queries `User` model from MongoDB Users DB on port 27017.
 *   3. Defends against account enumeration and timing attacks using constant-time
 *      dummy bcrypt hash comparisons.
 *   4. Generates and signs a cryptographically secure JWT token valid for 24 hours.
 *
 * COMMUNICATES WITH:
 *   - Mounted by `server/src/app.ts` under prefix `/api/auth` -> `/api/auth/login`.
 *   - Calls `server/src/models/User.ts` to locate user credentials.
 *   - Consumed by Angular client's `AuthService.login()` method.
 *   - Verified by unit tests in `server/src/routes/auth.routes.test.ts`.
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. Angular login form posts `{ email: 'qa.user@quicktix.test', password: 'Passw0rd!test' }`.
 *   2. `loginLimiter` checks IP request count (max 10 in dev/prod; 1000 in test).
 *   3. If email/password missing -> early returns HTTP 401 Unauthorized.
 *   4. Queries `User.findOne({ email })`.
 *      - If user DOES NOT exist: runs `bcrypt.compare(cleanPassword, DUMMY_HASH)`
 *        so response time is identical to a real user check (stops timing attacks),
 *        then returns HTTP 401.
 *      - If user EXISTS: compares password with stored bcrypt hash.
 *   5. If password matches: creates JWT containing `{ id, email }` signed with `JWT_SECRET`.
 *   6. Responds with `HTTP 200 { token: 'eyJ...' }`.
 * ============================================================================
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';

const router = Router();

// Constant precomputed dummy hash to mitigate timing attacks and user enumeration.
// Running bcrypt.compare against this when a user does not exist ensures the response
// time is indistinguishable from a valid user with a wrong password.
const DUMMY_HASH = bcrypt.hashSync('timing_mitigation_dummy_password', 10);

const isTest = (process.env.NODE_ENV || '').toLowerCase() === 'test';

// ----------------------------------------------------------------------------
// Rate Limiter Middleware
// ----------------------------------------------------------------------------
// Limits brute-force login attempts per IP address
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute sliding window
  max: isTest ? 1000 : 10,  // Max 10 attempts in production/dev, relaxed for automated tests
  standardHeaders: true,    // Returns standard RateLimit-* headers
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
  },
});

// ----------------------------------------------------------------------------
// POST /api/auth/login
// ----------------------------------------------------------------------------
router.post('/login', loginLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  // Validate presence of credentials
  if (!email || !password) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid email or password',
    });
    return;
  }

  try {
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPassword = typeof password === 'string' ? password.trim() : '';

    // Query user in MongoDB Users DB (port 27017)
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      // Execute constant-time dummy hash comparison to eliminate timing-based user enumeration
      await bcrypt.compare(cleanPassword, DUMMY_HASH);
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    // Verify bcrypt password hash
    const isMatch = await bcrypt.compare(cleanPassword, user.password);

    if (!isMatch) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    // Validate that user.role in MongoDB is strictly a valid enum value ('user' or 'admin').
    // Never fall back with || 'user' or issue tokens for corrupted role values (e.g. 'use').
    if (user.role !== 'user' && user.role !== 'admin') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    // Sign 24-hour JSON Web Token with HMAC SHA-256
    const secret = process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-production';
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      secret,
      { algorithm: 'HS256', expiresIn: '24h' }
    );

    res.status(200).json({ token });
  } catch (err: any) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// ----------------------------------------------------------------------------
// Rate Limiter for Account Registration
// ----------------------------------------------------------------------------
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: 'Too many account creation attempts, please try again later',
  },
});

// ----------------------------------------------------------------------------
// POST /api/auth/register (Create New Account)
// ----------------------------------------------------------------------------
router.post('/register', registerLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'ValidationError', message: 'Email is required' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(cleanEmail)) {
    res.status(400).json({ error: 'ValidationError', message: 'Please enter a valid email address' });
    return;
  }

  if (!password || typeof password !== 'string' || password.trim().length < 6) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Password must be at least 6 characters long',
    });
    return;
  }

  const cleanPassword = password.trim();

  try {
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      res.status(409).json({
        error: 'Conflict',
        message: 'An account with this email address already exists',
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    const newUser = new User({
      email: cleanEmail,
      password: hashedPassword,
      role: 'user',
    });

    await newUser.save();

    const secret = process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-production';
    const token = jwt.sign(
      { id: newUser._id.toString(), email: newUser.email, role: newUser.role || 'user' },
      secret,
      { algorithm: 'HS256', expiresIn: '24h' }
    );

    res.status(201).json({ token, message: 'Account created successfully' });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({
        error: 'Conflict',
        message: 'An account with this email address already exists',
      });
      return;
    }
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

export const authRouter = router;
