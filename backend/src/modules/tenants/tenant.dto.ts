import { z } from 'zod';

const tenantShape = {
  full_name: z.string().trim().min(3).max(150),
  doc_type: z.enum(['V', 'E', 'J', 'G', 'R']),
  doc_number: z.string().trim().min(2).max(20),
  phone: z.string().trim().regex(/^\+?\d{6,19}$/, 'Teléfono E.164 (+58...)'),
  local_number: z.string().trim().min(1).max(20),
  is_active: z.boolean(),
};

export const tenantCreateSchema = z.object({
  ...tenantShape,
  doc_type: tenantShape.doc_type.default('V'),
  is_active: tenantShape.is_active.default(true),
});

/** Sin .default(): los campos omitidos no deben sobrescribir valores existentes. */
export const tenantUpdateSchema = z.object(tenantShape).partial();
