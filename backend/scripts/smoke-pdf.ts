/* Smoke test del PDF (no requiere BD): npx tsx scripts/smoke-pdf.ts */
import { writeFileSync, mkdirSync } from 'node:fs';
import { renderReceiptPdf } from '../src/modules/receipts/receipts.pdf';

const sample = {
  id: 1,
  receipt_number: 12,
  tenant_id: 1,
  tenant_name: 'Juan Pérez',
  local_number: '4A',
  phone: '+58412000000',
  period_month: 10,
  period_year: 2026,
  issue_date: '2026-10-30',
  amount_bs: 4000,
  amount_usd: 100,
  exchange_rate: 40,
  iva_rate: 16,
  iva_amount: 640,
  total_received: 4640,
  payment_reference: '000123456789',
  whatsapp_sent: false,
};

mkdirSync('scripts/out', { recursive: true });

async function main() {
  const buf = await renderReceiptPdf(sample as never);
  writeFileSync('scripts/out/recibo-test.pdf', buf);
  console.log('OK pdf bytes:', buf.length, `(${(buf.length / 1024).toFixed(1)} KiB)`);
}

main();
