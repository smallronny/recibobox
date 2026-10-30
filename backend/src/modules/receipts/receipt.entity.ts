import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';

@Entity({ name: 'receipts' })
@Index('idx_receipt_period', ['period_year', 'period_month'])
@Index('idx_receipt_issue', ['issue_date'])
export class Receipt {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  /** N.º incremental: lo asigna el trigger trg_receipts_number (BD). */
  @Column({ name: 'receipt_number', type: 'int', unsigned: true, insert: false, update: false })
  receipt_number!: number;

  @ManyToOne(() => Tenant, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'period_month', type: 'tinyint' })
  period_month!: number;

  @Column({ name: 'period_year', type: 'smallint' })
  period_year!: number;

  @Column({ name: 'issue_date', type: 'date' })
  issue_date!: string;

  @Column({ name: 'amount_bs', type: 'decimal', precision: 14, scale: 2 })
  amount_bs!: number;

  @Column({ name: 'amount_usd', type: 'decimal', precision: 14, scale: 2 })
  amount_usd!: number;

  @Column({ name: 'exchange_rate', type: 'decimal', precision: 12, scale: 4, nullable: true })
  exchange_rate!: number;

  @Column({ name: 'iva_rate', type: 'decimal', precision: 5, scale: 2 })
  iva_rate!: number;

  /** Columnas generadas en BD (STORED): solo lectura. */
  @Column({ name: 'iva_amount', type: 'decimal', precision: 14, scale: 2, insert: false, update: false })
  iva_amount!: number;

  @Column({ name: 'total_received', type: 'decimal', precision: 14, scale: 2, insert: false, update: false })
  total_received!: number;

  @Column({ name: 'payment_reference', type: 'varchar', length: 50, nullable: true })
  payment_reference!: string | null;

  @Column({ name: 'whatsapp_sent', type: 'boolean' })
  whatsapp_sent!: boolean;

  @Column({ name: 'whatsapp_sent_at', type: 'datetime', nullable: true })
  whatsapp_sent_at!: Date | null;
}
