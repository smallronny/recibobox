import { AppDataSource } from '../../config/database';
import { AppError } from '../../config/errors';
import { Receipt } from './receipt.entity';
import { Tenant } from '../tenants/tenant.entity';

/** Forma plana que consume el frontend y el PDF (contrato con frontend/src/app/core/models/receipt.model.ts) */
export interface ReceiptFlat {
  id: number;
  receipt_number: number;
  tenant_id: number;
  tenant_name: string;
  local_number: string;
  phone: string;
  period_month: number;
  period_year: number;
  issue_date: string;
  amount_bs: number;
  amount_usd: number;
  exchange_rate: number;
  iva_rate: number;
  iva_amount: number;
  total_received: number;
  payment_reference: string | null;
  whatsapp_sent: boolean;
}

function toISODate(d: string | Date): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return d.slice(0, 10);
}

function flat(r: Receipt): ReceiptFlat {
  return {
    id: r.id,
    receipt_number: r.receipt_number,
    tenant_id: r.tenant.id,
    tenant_name: r.tenant.full_name,
    local_number: r.tenant.local_number,
    phone: r.tenant.phone,
    period_month: r.period_month,
    period_year: r.period_year,
    issue_date: toISODate(r.issue_date),
    amount_bs: r.amount_bs,
    amount_usd: r.amount_usd,
    exchange_rate: r.exchange_rate,
    iva_rate: r.iva_rate,
    iva_amount: r.iva_amount,
    total_received: r.total_received,
    payment_reference: r.payment_reference,
    whatsapp_sent: Boolean(r.whatsapp_sent),
  };
}

export interface ReceiptQuery {
  tenant_id?: number;
  year?: number;
  month?: number;
  limit?: number;
  offset?: number;
}

export class ReceiptService {
  private repo() {
    return AppDataSource.getRepository(Receipt);
  }

  private qb() {
    return this.repo().createQueryBuilder('r').leftJoinAndSelect('r.tenant', 't');
  }

  /** POST /api/receipts — receipt_number/IVA/Total los calcula la BD (trigger + columnas generadas). */
  async create(input: {
    tenant_id: number;
    period_month: number;
    period_year: number;
    issue_date: string;
    amount_bs: number;
    amount_usd: number;
    exchange_rate: number;
    payment_reference?: string | null;
  }): Promise<ReceiptFlat> {
    const tenant = await AppDataSource.getRepository(Tenant).findOneBy({ id: input.tenant_id });
    if (!tenant) throw new AppError(404, 'Inquilino no encontrado');

    const r = await this.repo().save({
      tenant: { id: input.tenant_id },
      period_month: input.period_month,
      period_year: input.period_year,
      issue_date: input.issue_date,
      amount_bs: input.amount_bs,
      amount_usd: input.amount_usd,
      exchange_rate: input.exchange_rate,
      payment_reference: input.payment_reference ?? null,
    });

    // Recarga para leer receipt_number (trigger) e IVA/Total (columnas generadas)
    return this.byId((r as Receipt).id);
  }

  async list(q: ReceiptQuery): Promise<ReceiptFlat[]> {
    const { tenant_id, year, month } = q;
    const qb = this.qb();
    if (tenant_id) qb.andWhere('t.id = :tenant_id', { tenant_id });
    if (year) qb.andWhere('r.period_year = :year', { year });
    if (month) qb.andWhere('r.period_month = :month', { month });
    const rows = await qb
      .orderBy('r.id', 'DESC')
      .take(Math.min(q.limit ?? 100, 200))
      .skip(q.offset ?? 0)
      .getMany();
    return rows.map(flat);
  }

  async byId(id: number): Promise<ReceiptFlat> {
    const r = await this.qb().where('r.id = :id', { id }).getOne();
    if (!r) throw new AppError(404, 'Recibo no encontrado');
    return flat(r);
  }

  async markWhatsappSent(id: number): Promise<void> {
    await this.repo().update(
      { id },
      { whatsapp_sent: true, whatsapp_sent_at: new Date() },
    );
  }
}
