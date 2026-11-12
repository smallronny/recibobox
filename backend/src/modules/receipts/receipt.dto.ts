import { z } from 'zod';

export const createReceiptSchema = z
  .object({
    tenant_id: z.coerce.number().int().positive(),
    period_month: z.coerce.number().int().min(1).max(12),
    period_year: z.coerce.number().int().min(2000).max(2100),
    issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
    amount_bs: z.coerce.number().min(0).max(999_999_999_999).default(0),
    amount_usd: z.coerce.number().min(0).max(999_999_999_999).default(0),
    exchange_rate: z.coerce.number().min(0).max(999_999.9999).nullable().optional(),
    amount_eur: z.coerce.number().min(0).max(999_999_999_999).default(0),
    exchange_rate_eur: z.coerce.number().min(0).max(999_999.9999).nullable().optional(),
    iva_rate: z.coerce.number().min(0).max(100).default(16),
    payment_reference: z.string().trim().max(50).nullable().optional(),
  })
  .refine(v => v.amount_bs > 0 || v.amount_usd > 0 || v.amount_eur > 0, {
    message: 'Indica el monto en Bs., USD o EUR',
    path: ['amount_bs'],
  });
