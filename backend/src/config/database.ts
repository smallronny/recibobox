import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Tenant } from '../modules/tenants/tenant.entity';
import { Receipt } from '../modules/receipts/receipt.entity';

/**
 * Estructura administrada por backend/sql/schema.sql (DDL canónico):
 * synchronize/migrations desactivados.
 */
export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'recibo_box',
  entities: [Tenant, Receipt],
  synchronize: false,
  migrationsRun: false,
  logging: (process.env.DB_LOGGING === '1' ? ['error', 'warn'] : ['error']) as any,
  extra: {
    connectionLimit: 10,
    decimalNumbers: true, // DECIMAL → number (montos dentro del rango seguro de JS)
  },
});
