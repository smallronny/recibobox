import { Router, type Request, type Response } from 'express';
import { ah } from '../../config/async-handler';
import { RatesService } from './rates.service';

export function ratesRoutes(): Router {
  const service = new RatesService();
  const r = Router();

  r.get(
    '/bcv',
    ah(async (req: Request, res: Response) => {
      const date = typeof req.query.date === 'string' ? req.query.date : undefined;
      const rates = await service.getBcvRates(date);
      res.json(rates);
    }),
  );

  return r;
}

