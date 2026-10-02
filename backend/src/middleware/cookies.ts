import cookie from 'cookie';
import type { Request, Response, NextFunction } from 'express';

export function cookieParserMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.cookie;

  /*
   * Express 5 already exposes req.cookies through its type
   * definitions. Do not redeclare Request.cookies here.
   */
  req.cookies = header ? cookie.parse(header) : {};

  next();
}
