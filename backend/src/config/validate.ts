import { ZodSchema } from 'zod';
import { AppError } from './errors';

/** Middleware: valida body con zod; reemplaza req.body con el dato parseado. */
export function validate(schema: ZodSchema) {
  return (req: any, _res: any, next: (e?: unknown) => void) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      next(new AppError(400, 'Datos inválidos', r.error.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message,
      }))));
      return;
    }
    req.body = r.data;
    next();
  };
}
