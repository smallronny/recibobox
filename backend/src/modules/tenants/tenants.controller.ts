import type { Request, Response } from 'express';
import { TenantService } from './tenants.service';

export class TenantController {
  constructor(private readonly s: TenantService) {}

  list = async (req: Request, res: Response) =>
    res.json(await this.s.list(req.query.all === '1'));

  get = async (req: Request, res: Response) =>
    res.json(await this.s.get(Number(req.params.id)));

  create = async (req: Request, res: Response) => {
    const t = await this.s.create(req.body);
    res.status(201).json(t);
  };

  update = async (req: Request, res: Response) =>
    res.json(await this.s.update(Number(req.params.id), req.body));

  remove = async (req: Request, res: Response) => {
    await this.s.remove(Number(req.params.id));
    res.status(204).send();
  };
}
