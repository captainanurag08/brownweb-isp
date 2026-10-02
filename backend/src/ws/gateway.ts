import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

type Part = 'body' | 'query' | 'params';

export function validate(part: Part, schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const message =
        result.error.issues[0]?.message ?? 'Invalid request.';

      return next(
        AppError.badRequest(message, 'invalid_input')
      );
    }

    /*
     * Express 5 exposes req.query through a getter.
     * Do NOT assign back to req.query.
     *
     * The existing routes already validate and then read
     * req.query/body/params with their appropriate types.
     *
     * For body and params, assignment is still safe and useful.
     * For query, validation is performed without mutation.
     */
    if (part !== 'query') {
      (req as unknown as Record<string, unknown>)[part] = result.data;
    }

    next();
  };
}
