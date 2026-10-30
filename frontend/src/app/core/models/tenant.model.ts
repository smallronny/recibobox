/** Inquilino (espeja la tabla `tenants`) */
export interface Tenant {
  id: number;
  full_name: string;
  doc_type: DocType;
  doc_number: string;
  phone: string;
  local_number: string;
  is_active: boolean;
}

export type DocType = 'V' | 'E' | 'J' | 'G' | 'R';

/** Payload de create/update (el backend aplica zod igual en ambos) */
export interface TenantUpsert {
  full_name: string;
  doc_type: DocType;
  doc_number: string;
  phone: string;
  local_number: string;
  is_active: boolean;
}

export const DOC_TYPES = ['V', 'E', 'J', 'G', 'R'] as const;
