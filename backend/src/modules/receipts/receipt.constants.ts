export const ES_MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

export const money = (n: number | string): string =>
  Number(n ?? 0).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const rate = (n: number | string): string =>
  Number(n ?? 0).toLocaleString('es-VE', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

export const dateES = (iso: string): string => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};
