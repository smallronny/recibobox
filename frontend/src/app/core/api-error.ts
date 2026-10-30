/** Traduce un error HttpErrorResponse del backend (zod una estructura) a texto de UI. */
export function apiError(e: unknown, fallback = 'Error inesperado'): string {
  const j = (e as { error?: { error?: string; details?: Array<{ field: string; message: string }> } }).error;
  if (!j?.error) return fallback;
  return j.details?.length
    ? `${j.error}: ${j.details.map(d => d.message).join('; ')}`
    : j.error;
}
