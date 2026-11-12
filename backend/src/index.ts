import 'dotenv/config';
import 'reflect-metadata';
import cors from 'cors';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { AppDataSource } from './config/database';
import { AppError } from './config/errors';
import { tenantsRoutes } from './modules/tenants/tenants.routes';
import { receiptsRoutes } from './modules/receipts/receipts.routes';
import { ratesRoutes } from './modules/rates/rates.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { requireAuth } from './modules/auth/auth.middleware';
import { AuthService } from './modules/auth/auth.service';

/**
 * Prefijos bajo los que se monta la API.
 *
 * - Local: /api
 * - cPanel / Nginx / Reverse Proxy: /api
 */
function apiPrefixes(): string[] {
  const configured = (process.env.API_PREFIXES ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const baseUri = (process.env.PASSENGER_BASE_URI ?? '').replace(/\/+$/, '');
  const passengerPrefix = `${baseUri}/api`;
  return [...new Set([passengerPrefix, '/api', ...configured])];
}

function buildApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  for (const prefix of apiPrefixes()) {
    // Rutas públicas de autenticación (/api/auth/login, etc.)
    app.use(`${prefix}/auth`, authRoutes());
    // Rutas protegidas que requieren token de administrador
    app.use(`${prefix}/tenants`, requireAuth, tenantsRoutes());
    app.use(`${prefix}/receipts`, requireAuth, receiptsRoutes());
    // Tasas de cambio (BCV) y estado del servidor
    app.use(`${prefix}/rates`, ratesRoutes());
    app.get(`${prefix}/health`, (_req: Request, res: Response) => res.json({ ok: true }));
  }

  app.use((_req: Request, res: Response) => res.status(404).json({ error: 'No encontrado' }));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.status).json({ error: err.message, details: err.details ?? undefined });
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}

async function main(): Promise<void> {
  await AppDataSource.initialize();

  // Asegura la existencia del usuario administrador inicial
  const authService = new AuthService();
  await authService.ensureInitialAdmin();

  const port = Number(process.env.PORT ?? process.env.APP_PORT ?? 3000);
  buildApp().listen(port, () => {
    console.log(`✔ API recibo-box: http://localhost:${port}/api`);
    console.log(`  POST /api/auth/login · GET /api/auth/me`);
    console.log(`  GET health: /api/health`);
    console.log(`  GET/POST/PUT/DELETE /api/tenants [Auth]`);
    console.log(`  GET/POST /api/receipts · GET /api/receipts/:id/pdf · POST /api/receipts/:id/whatsapp [Auth]`);
  });
}

main().catch(e => {
  console.error('❌ Error al iniciar:', e);
  process.exit(1);
});
