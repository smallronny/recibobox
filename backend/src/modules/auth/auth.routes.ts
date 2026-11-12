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

  // POST /api/auth/change-password (usuario actual)
  router.post('/change-password', requireAuth, async (req: Request, res: Response, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }

      const { current_password, new_password } = req.body;
      if (!current_password || !new_password) {
        res.status(400).json({ error: 'La contraseña actual y la nueva son requeridas' });
        return;
      }

      await service.changePassword(req.user.id, current_password, new_password);
      res.json({ ok: true, message: 'Contraseña actualizada correctamente' });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/auth/users (solo admin)
  router.get('/users', requireAuth, async (req: Request, res: Response, next) => {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Permisos insuficientes. Requiere rol de administrador.' });
        return;
      }
      const users = await service.listUsers();
      res.json(users);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/auth/users (crear usuario - solo admin)
  router.post('/users', requireAuth, async (req: Request, res: Response, next) => {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Permisos insuficientes. Requiere rol de administrador.' });
        return;
      }

      const { username, email, password, role } = req.body;
      if (!username || !email || !password) {
        res.status(400).json({ error: 'Usuario, email y contraseña son requeridos' });
        return;
      }

      const newUser = await service.createUser({ username, email, password, role });
      res.status(201).json(newUser);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/auth/users/:username/password (restablecer contraseña por admin)
  router.post('/users/:username/password', requireAuth, async (req: Request, res: Response, next) => {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Permisos insuficientes. Requiere rol de administrador.' });
        return;
      }

      const { new_password } = req.body;
      if (!new_password) {
        res.status(400).json({ error: 'La nueva contraseña es requerida' });
        return;
      }

      await service.adminSetPassword(req.params.username, new_password);
      res.json({ ok: true, message: `Contraseña de ${req.params.username} actualizada correctamente` });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
