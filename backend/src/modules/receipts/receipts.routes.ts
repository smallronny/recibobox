import { Router } from 'express';
import { ah } from '../../config/async-handler';
import { validate } from '../../config/validate';
import { createReceiptSchema } from './receipt.dto';
import { ReceiptService } from './receipts.service';
import { ReceiptController } from './receipts.controller';
import { WhatsappService } from '../whatsapp/whatsapp.service';

export function receiptsRoutes(): Router {
  const c = new ReceiptController(new ReceiptService(), new WhatsappService());
  const r = Router();

  r.get('/', ah(c.list));
  r.get('/:id', ah(c.get));
  r.get('/:id/pdf', ah(c.pdf));
  r.post('/', validate(createReceiptSchema), ah(c.create));
  r.post('/:id/whatsapp', ah(c.whatsapp));

  return r;
}
