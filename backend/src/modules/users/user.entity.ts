import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type UserRole = 'admin' | 'operador';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  password_hash!: string;

  @Column({ name: 'password_salt', type: 'varchar', length: 64 })
  password_salt!: string;

  @Column({ type: 'enum', enum: ['admin', 'operador'], default: 'admin' })
  role!: UserRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ name: 'created_at', type: 'timestamp', insert: false, update: false })
  created_at!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', insert: false, update: false })
  updated_at!: Date;
}

