import { AppError } from '../../config/errors';
import { ES_MONTHS, money, rate } from '../receipts/receipt.constants';
import type { ReceiptFlat } from '../receipts/receipts.service';

/**
 * WhatsApp Cloud API (Meta Graph). Envía al inquilino:
 *  - el PDF dual del recibo (documento)
 *  - resumen en texto
 * y reenvía el resumen al administrador (copia).
 * Credenciales en .env (ver .env.example).
 */
export class WhatsappService {
  private readonly token = process.env.WHATSAPP_TOKEN ?? '';
  private readonly phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
  private readonly version = process.env.WHATSAPP_API_VERSION ?? 'v21.0';
  private readonly admin = process.env.ADMIN_WHATSAPP ?? '';

  private url(path: string): string {
    return `https://graph.facebook.com/${this.version}/${this.phoneId}${path}`;
  }

  private assertConfigured(): void {
    if (!this.token || !this.phoneId) {
      throw new AppError(
        503,
        'WhatsApp no configurado: define WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID (ver backend/.env.example)',
      );
    }
  }

  private async messages(body: Record<string, unknown>): Promise<void> {
    const res = await fetch(this.url('/messages'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new AppError(502, `WhatsApp Cloud API respondió ${res.status}`, detail);
    }
  }

  private async uploadPdf(pdf: Buffer, filename: string): Promise<string> {
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('file', new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }), filename);
    const res = await fetch(this.url('/media'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: form,
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    if (!res.ok || !data.id) {
      throw new AppError(502, 'No se pudo subir el PDF a WhatsApp', data);
    }
    return data.id;
  }

  private summary(r: ReceiptFlat): string {
    return [
      `🧾 *Recibo N.º ${String(r.receipt_number).padStart(6, '0')}* — ${ES_MONTHS[r.period_month - 1]} ${r.period_year}`,
      `Recibido de: ${r.tenant_name} (Local ${r.local_number})`,
      `Monto: ${money(r.amount_bs)} Bs. (${money(r.amount_usd)} USD @ ${rate(r.exchange_rate)})`,
      `IVA ${r.iva_rate}%: ${money(r.iva_amount)} Bs.`,
      `*TOTAL RECIBIDO: ${money(r.total_received)} Bs.*`,
      r.payment_reference ? `Ref. bancaria: ${r.payment_reference}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  async sendReceipt(r: ReceiptFlat, pdf: Buffer): Promise<void> {
    this.assertConfigured();
    const text = this.summary(r);
    const filename = `recibo-${String(r.receipt_number).padStart(6, '0')}.pdf`;

    // 1) Al inquilino: documento PDF dual + caption con el detalle
    const mediaId = await this.uploadPdf(pdf, filename);
    await this.messages({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: r.phone,
      type: 'document',
      document: { id: mediaId, filename, caption: text },
    });

    // 2) Copia al administrador (resumen en texto)
    if (this.admin && this.admin !== r.phone) {
      await this.messages({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.admin,
        type: 'text',
        text: { body: `📋 Copia · administración\n\n${text}` },
      });
    }
  }
}
