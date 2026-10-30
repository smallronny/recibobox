import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Envuelve handlers async para Express 4: cualquier rechazo/throw
 * se deriva a next(err) en vez de tumbar el proceso.
 */
export function ah(fn: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      Promise.resolve(fn(req, res, next)).catch(next);
    } catch (e) {
      next(e);
    }
  };
}
