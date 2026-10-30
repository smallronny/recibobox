import { AppDataSource } from '../../config/database';
import { AppError } from '../../config/errors';
import { Tenant } from './tenant.entity';

const isDbError = (e: unknown, code: string): boolean =>
  typeof e === 'object' && e !== null && (e as { code?: string }).code === code;

export class TenantService {
  private repo() {
    return AppDataSource.getRepository(Tenant);
  }

  list(all: boolean): Promise<Tenant[]> {
    return this.repo().find({
      where: all ? {} : { is_active: true },
      order: { full_name: 'ASC' },
    });
  }

  async get(id: number): Promise<Tenant> {
    const t = await this.repo().findOneBy({ id });
    if (!t) throw new AppError(404, 'Inquilino no encontrado');
    return t;
  }

  async create(data: Partial<Tenant>): Promise<Tenant> {
    try {
      return await this.repo().save(data);
    } catch (e) {
      if (isDbError(e, 'ER_DUP_ENTRY')) {
        throw new AppError(409, 'Documento o N.º de local ya registrados');
      }
      throw e;
    }
  }

  async update(id: number, data: Partial<Tenant>): Promise<Tenant> {
    const tenant = await this.get(id);
    Object.assign(tenant, data);
    try {
      return await this.repo().save(tenant);
    } catch (e) {
      if (isDbError(e, 'ER_DUP_ENTRY')) {
        throw new AppError(409, 'Documento o N.º de local ya registrados');
      }
      throw e;
    }
  }

  async remove(id: number): Promise<void> {
    await this.get(id);
    try {
      await this.repo().delete(id);
    } catch (e) {
      if (isDbError(e, 'ER_ROW_IS_REFERENCED_2')) {
        throw new AppError(409, 'El inquilino tiene recibos; desactívalo (is_active=0) en lugar de eliminarlo');
      }
      throw e;
    }
  }
}
