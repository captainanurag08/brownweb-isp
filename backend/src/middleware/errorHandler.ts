import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error(err.message, { code: err.code, path: req.path });
    }
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }

  logger.error('Unhandled error', {
    path: req.path,
    method: req.method,
    error: err instanceof Error ? err.stack ?? err.message : String(err),
  });
  res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong on our end.' } });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'not_found', message: 'No such endpoint.' } });
}
