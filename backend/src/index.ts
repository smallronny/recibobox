import 'dotenv/config';
import 'reflect-metadata';
import cors from 'cors';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { AppDataSource } from './config/database';
import { AppError } from './config/errors';
import { tenantsRoutes } from './modules/tenants/tenants.routes';
import { receiptsRoutes } from './modules/receipts/receipts.routes';

function buildApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/tenants', tenantsRoutes());
  app.use('/api/receipts', receiptsRoutes());

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
  const port = Number(process.env.APP_PORT ?? 3000);
  buildApp().listen(port, () => {
    console.log(`✔ API recibo-box: http://localhost:${port}/api`);
    console.log(`  GET/POST/PUT/DELETE /api/tenants`);
    console.log(`  GET/POST /api/receipts · GET /api/receipts/:id/pdf · POST /api/receipts/:id/whatsapp`);
  });
}

main().catch(e => {
  console.error('❌ Error al iniciar:', e);
  process.exit(1);
});
