import cookie from 'cookie';
import type { Request, Response, NextFunction } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    cookies: Record<string, string>;
  }
}

export function cookieParserMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.cookie;
  req.cookies = header ? cookie.parse(header) : {};
  next();
}
