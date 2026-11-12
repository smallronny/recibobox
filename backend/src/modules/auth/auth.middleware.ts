import { type NextFunction, type Request, type Response } from 'express';
import { AuthService, type UserPayload } from './auth.service';

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

const authService = new AuthService();

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // 1. Obtener token de Bearer header o query param (útil para <a target="_blank"> en PDFs)
  let token: string | undefined;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (typeof req.query.token === 'string') {
    token = req.query.token.trim();
  }

  if (!token) {
    res.status(401).json({ error: 'No autorizado. Token de sesión requerido.' });
    return;
  }

  const payload = authService.verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Sesión expirada o token inválido.' });
    return;
  }

  req.user = payload;
  next();
}

