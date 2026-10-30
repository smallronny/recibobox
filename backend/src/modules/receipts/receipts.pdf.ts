import PDFDocument from 'pdfkit';
import { ES_MONTHS, dateES, money, rate } from './receipt.constants';
import type { ReceiptFlat } from './receipts.service';

const W = 595.28; // A4 ancho (pt)
const ML = 40;
const MR = W - ML;
const GRAY = '#64748b';

/** PDF A4 con dos copias apiladas: ORIGINAL · INQUILINO / COPIA · PROPIETARIO. */
export async function renderReceiptPdf(r: ReceiptFlat): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  const chunks: Buffer[] = [];
  doc.on('data', (b: Buffer) => chunks.push(b));
  const done = new Promise<Buffer>(resolve =>
    doc.on('end', () => resolve(Buffer.concat(chunks))),
  );

  const full = W - ML * 2;
  const num = String(r.receipt_number).padStart(6, '0');

  const put = (
    text: string,
    y: number,
    o: { bold?: boolean; color?: string; align?: 'left' | 'right' | 'center'; size?: number; width?: number; tracking?: number } = {},
    x = ML,
  ) =>
    doc
      .font(o.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(o.size ?? 10)
      .fillColor(o.color ?? '#0f172a')
      .text(text, x, y, {
        width: o.width ?? full,
        align: o.align ?? 'left',
        characterSpacing: o.tracking ?? 0,
      });

  const line = (y: number, color: string, w = 0.75, x1 = ML, x2 = MR) =>
    doc.moveTo(x1, y).lineTo(x2, y).lineWidth(w).strokeColor(color).stroke();

  const drawCopy = (y0: number, tag: string): void => {
    put(tag.toUpperCase(), y0 + 14, { size: 8, color: '#94a3b8', tracking: 1 });
    put(`RECIBO N.º ${num}`, y0 + 12, { size: 11, bold: true, align: 'right' });
    put('RECIBO DE PAGO', y0 + 40, { size: 16, bold: true, align: 'center', tracking: 3 });
    line(y0 + 66, '#0f172a', 1.25);

    // Datos principales
    put('Recibido de', y0 + 84, { size: 7.5, color: GRAY });
    put(r.tenant_name, y0 + 94, { bold: true, size: 10.5 });
    put('N.º de local', y0 + 84, { size: 7.5, color: GRAY, align: 'right' });
    put(r.local_number, y0 + 94, { bold: true, size: 10.5, align: 'right' });

    put('Período pagado', y0 + 124, { size: 7.5, color: GRAY });
    put(`${ES_MONTHS[r.period_month - 1]} ${r.period_year}`, y0 + 134, { bold: true, size: 10.5 });
    put('Fecha de emisión', y0 + 124, { size: 7.5, color: GRAY, align: 'right' });
    put(dateES(r.issue_date), y0 + 134, { bold: true, size: 10.5, align: 'right' });

    put('Concepto', y0 + 164, { size: 7.5, color: GRAY });
    put(`Alquiler de local comercial — ${ES_MONTHS[r.period_month - 1]} ${r.period_year}`, y0 + 174, {
      size: 10,
    });

    // Montos (alineados a la derecha)
    put('Monto', y0 + 206, { size: 7.5, color: GRAY });
    put(`${money(r.amount_bs)} Bs.`, y0 + 204, { bold: true, align: 'right' });
    put('Monto USD', y0 + 224, { size: 7.5, color: GRAY });
    put(`${money(r.amount_usd)} USD · Tasa ${rate(r.exchange_rate)}`, y0 + 222, {
      bold: true,
      align: 'right',
    });
    put(`IVA ${r.iva_rate}%`, y0 + 242, { size: 7.5, color: GRAY });
    put(`${money(r.iva_amount)} Bs.`, y0 + 240, { bold: true, align: 'right' });

    line(y0 + 262, '#334155', 1);
    put('Total recibido', y0 + 274, { size: 8, bold: true, color: GRAY, tracking: 0.5 });
    put(`${money(r.total_received)} Bs.`, y0 + 270, { bold: true, size: 13, align: 'right' });

    // Referencia bancaria
    put('Referencia de pago bancario', y0 + 306, { size: 7.5, color: GRAY });
    put(r.payment_reference || '—', y0 + 316, { bold: true, size: 10.5 });

    // Firmas
    line(y0 + 356, '#94a3b8', 0.75, ML, ML + 180);
    line(y0 + 356, '#94a3b8', 0.75, MR - 180, MR);
    put('Firma del inquilino', y0 + 362, { size: 7.5, color: GRAY, align: 'center', width: 180 });
    put('Firma del propietario', y0 + 362, { size: 7.5, color: GRAY, align: 'center', width: 180 }, MR - 180);

    put('recibo-box · Sistema de gestión de recibos', y0 + 396, {
      size: 6.5,
      color: '#94a3b8',
      align: 'center',
    });
  };

  for (const [i, tag] of ['ORIGINAL · INQUILINO', 'COPIA · PROPIETARIO'].entries()) {
    drawCopy(i * 421, tag);
  }

  // Separador entre copias
  doc.moveTo(ML, 420.5).lineTo(MR, 420.5).lineWidth(0.75).strokeColor('#cbd5e1').dash(4, { space: 4 }).stroke();
  doc.undash();

  doc.end();
  return done;
}
