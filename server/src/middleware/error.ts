/**
 * ============================================================================
 * FOLDER: server/src/middleware/
 * ============================================================================
 * Centralized Error Middleware: Standardizes error responses across Express
 * routes, catching domain errors, Mongoose exceptions, and body parser faults.
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../errors/customError.js';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle explicit CustomError instances first
  if (err instanceof CustomError) {
    res.status(err.statusCode).json({
      error: err.errorType,
      message: err.message,
    });
    return;
  }

  // Gracefully handle malformed JSON syntax errors from express.json()
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'BadRequest', message: 'Malformed JSON payload' });
    return;
  }

  // Handle Mongoose Invalid ObjectId CastError
  if (err.name === 'CastError') {
    res.status(404).json({
      error: 'NotFound',
      message: 'Ticket not found',
    });
    return;
  }

  // Handle Mongoose Schema Validation Errors
  if (err.name === 'ValidationError' && err.errors) {
    const firstMessage = Object.values(err.errors)[0] as any;
    res.status(400).json({
      error: 'ValidationError',
      message: firstMessage?.message || 'Validation error',
    });
    return;
  }

  // Handle MongoDB E11000 Duplicate Key Error
  if (err.code === 11000) {
    res.status(409).json({
      error: 'Conflict',
      message: 'An account with this email address already exists',
    });
    return;
  }

  // Unhandled / Internal Server Error fallback
  console.error('Unhandled Server Error:', err);
  const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  const safeMessage = isProduction ? 'An unexpected error occurred' : (err.message || 'An unexpected error occurred');
  res.status(500).json({ error: 'ServerError', message: safeMessage });
};
