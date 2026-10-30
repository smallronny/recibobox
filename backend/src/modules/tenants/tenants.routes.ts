import { Router } from 'express';
import { ah } from '../../config/async-handler';
import { validate } from '../../config/validate';
import { tenantCreateSchema, tenantUpdateSchema } from './tenant.dto';
import { TenantService } from './tenants.service';
import { TenantController } from './tenants.controller';

export function tenantsRoutes(): Router {
  const c = new TenantController(new TenantService());
  const r = Router();

  r.get('/', ah(c.list));
  r.get('/:id', ah(c.get));
  r.post('/', validate(tenantCreateSchema), ah(c.create));
  r.put('/:id', validate(tenantUpdateSchema), ah(c.update));
  r.delete('/:id', ah(c.remove));

  return r;
}
