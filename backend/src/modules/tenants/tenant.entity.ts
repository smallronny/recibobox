import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tenants' })
@Index('idx_tenant_name', ['full_name'])
export class Tenant {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  full_name!: string;

  @Column({ name: 'doc_type', type: 'enum', enumName: 'tenant_doc_type', enum: ['V', 'E', 'J', 'G', 'R'] })
  doc_type!: 'V' | 'E' | 'J' | 'G' | 'R';

  @Column({ name: 'doc_number', type: 'varchar', length: 20 })
  doc_number!: string;

  /** N.º WhatsApp formato E.164 (+58...) */
  @Column({ name: 'phone', type: 'varchar', length: 20 })
  phone!: string;

  @Column({ name: 'local_number', type: 'varchar', length: 20 })
  local_number!: string;

  /** tinyint(1) en BD; TypeORM lo hidrata como boolean. */
  @Column({ name: 'is_active', type: 'boolean' })
  is_active!: boolean;
}
