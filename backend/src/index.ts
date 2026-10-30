import 'dotenv/config';
import 'reflect-metadata';
import cors from 'cors';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { AppDataSource } from './config/database';
import { AppError } from './config/errors';
import { tenantsRoutes } from './modules/tenants/tenants.routes';
import { receiptsRoutes } from './modules/receipts/receipts.routes';

/**
 * Prefijos bajo los que se monta la API.
 *
 * - Local: /api
 * - cPanel (Passenger montando la app en un subdirectorio, ej.
 *   https://dominio.com/<carpeta>): la URL pública de cada ruta es
 *   https://dominio.com/<carpeta>/api/… y la app puede recibir la petición
 *   con el prefijo completo (/carpeta/api) o reducido (/api) según cómo
 *   Passenger exponga PASSENGER_BASE_URI. Se monta en ambos casos y —
 *   opcionalmente — también en los prefijos listados en API_PREFIXES
 *   (separados por coma).
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
    app.use(`${prefix}/tenants`, tenantsRoutes());
    app.use(`${prefix}/receipts`, receiptsRoutes());
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
  const port = Number(process.env.PORT ?? process.env.APP_PORT ?? 3000);
  buildApp().listen(port, () => {
    console.log(`✔ API recibo-box: http://localhost:${port}/api`);
    console.log(`  GET health: /api/health`);
    console.log(`  GET/POST/PUT/DELETE /api/tenants`);
    console.log(`  GET/POST /api/receipts · GET /api/receipts/:id/pdf · POST /api/receipts/:id/whatsapp`);
  });
}

main().catch(e => {
  console.error('❌ Error al iniciar:', e);
  process.exit(1);
});
