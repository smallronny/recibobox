import { Router, type Request, type Response } from 'express';
import { AuthService } from './auth.service';
import { requireAuth } from './auth.middleware';

export function authRoutes(): Router {
  const router = Router();
  const service = new AuthService();

  // POST /api/auth/login
  router.post('/login', async (req: Request, res: Response, next) => {
    try {
      const identifier = req.body.identifier || req.body.username || req.body.email;
      const password = req.body.password;

      if (!identifier || !password) {
        res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
        return;
      }

      const result = await service.login(String(identifier).trim(), String(password));
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/auth/me
  router.get('/me', requireAuth, async (req: Request, res: Response, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }
      const profile = await service.getProfile(req.user.id);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

