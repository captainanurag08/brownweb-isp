/**
 * A well-known, expected error condition (bad input, not found, locked account,
 * resource limit reached, ...). AppErrors are safe to show to the client: their
 * `message` is written for end users and never includes internals or stack
 * traces. Anything that is NOT an AppError is treated by the error handler as
 * unexpected, logged with detail, and shown to the client as a generic message.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }

  static badRequest(message: string, code = 'bad_request') {
    return new AppError(400, code, message);
  }
  static unauthorized(message = 'Please sign in to continue.', code = 'unauthorized') {
    return new AppError(401, code, message);
  }
  static forbidden(message = "You don't have access to that.", code = 'forbidden') {
    return new AppError(403, code, message);
  }
  static notFound(message = "That couldn't be found.", code = 'not_found') {
    return new AppError(404, code, message);
  }
  static conflict(message: string, code = 'conflict') {
    return new AppError(409, code, message);
  }
  static tooMany(message: string, code = 'rate_limited') {
    return new AppError(429, code, message);
  }
}
