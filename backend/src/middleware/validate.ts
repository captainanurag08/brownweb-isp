import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

type Part = 'body' | 'query' | 'params';

export function validate(part: Part, schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? 'Invalid request.';
      return next(AppError.badRequest(message, 'invalid_input'));
    }
    (req as unknown as Record<Part, unknown>)[part] = result.data;
    next();
  };
}
