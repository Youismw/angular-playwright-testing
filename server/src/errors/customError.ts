/**
 * ============================================================================
 * FOLDER: server/src/errors/
 * ============================================================================
 * Application Error Hierarchy: Standardized custom error classes inspired by
 * modular MEAN stack architectural patterns.
 * ============================================================================
 */

export class CustomError extends Error {
  public statusCode: number;
  public errorType: string;

  constructor(message: string, statusCode: number = 400, errorType: string = 'ValidationError') {
    super(message);
    this.statusCode = statusCode;
    this.errorType = errorType;
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

export class ValidationError extends CustomError {
  constructor(message: string) {
    super(message, 400, 'ValidationError');
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'Unauthorized');
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = 'Ticket not found') {
    super(message, 404, 'NotFound');
  }
}

export class ConflictError extends CustomError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'Conflict');
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'Forbidden');
  }
}
