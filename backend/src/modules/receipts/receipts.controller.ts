import type { Request, Response } from 'express';
import { renderReceiptPdf } from './receipts.pdf';
import type { ReceiptService } from './receipts.service';
import type { WhatsappService } from '../whatsapp/whatsapp.service';

export class ReceiptController {
  constructor(
    private readonly s: ReceiptService,
    private readonly wa: WhatsappService,
  ) {}

  list = async (req: Request, res: Response) => {
    const q = req.query;
    res.json(await this.s.list({
      tenant_id: q.tenant_id ? Number(q.tenant_id) : undefined,
      year: q.year ? Number(q.year) : undefined,
      month: q.month ? Number(q.month) : undefined,
      limit: q.limit ? Number(q.limit) : undefined,
      offset: q.offset ? Number(q.offset) : undefined,
    }));
  };

  get = async (req: Request, res: Response) => res.json(await this.s.byId(Number(req.params.id)));

  create = async (req: Request, res: Response) => res.status(201).json(await this.s.create(req.body));

  pdf = async (req: Request, res: Response) => {
    const data = await this.s.byId(Number(req.params.id));
    const copy = (req.query.copy as 'dual' | 'inquilino' | 'propietario') || 'dual';
    const buffer = await renderReceiptPdf(data, copy);
    const suffix = copy === 'dual' ? '' : `-${copy}`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="recibo-${String(data.receipt_number).padStart(6, '0')}${suffix}.pdf"`,
    );
    res.send(buffer);
  };

  whatsapp = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const target = (req.query.target as 'all' | 'inquilino' | 'propietario') || 'all';
    const data = await this.s.byId(id);
    await this.wa.sendReceipt(data, target);
    if (target === 'all' || target === 'inquilino') {
      await this.s.markWhatsappSent(id);
    }
    res.json({ sent: true, target });
  };
}
