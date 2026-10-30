/** Recibo de pago (espeja la tabla `receipts`; snake_case consistente con BD/API) */
export interface Receipt {
  id: number;
  receipt_number: number;
  tenant_id: number;
  tenant_name: string;
  local_number: string;
  period_month: number;
  period_year: number;
  issue_date: string;
  amount_bs: number;
  amount_usd: number;
  exchange_rate: number;
  iva_rate: number;
  iva_amount: number;
  total_received: number;
  payment_reference: string | null;
  whatsapp_sent: boolean;
}

/** Payload de creación (el backend/BD calcula IVA y Total sobre amount_bs) */
export interface CreateReceiptDto {
  tenant_id: number;
  period_month: number;
  period_year: number;
  issue_date: string;
  amount_bs: number;
  amount_usd: number;
  exchange_rate: number;
  payment_reference?: string;
}

export const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];
