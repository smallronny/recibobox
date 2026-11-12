import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../../core/api';
import { CreateReceiptDto, Receipt, BcvRates } from '../../core/models/receipt.model';

export interface ReceiptFilters {
  tenant_id?: number | null;
  year?: number | null;
  month?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ReceiptService {
  private readonly http = inject(HttpClient);

  /** GET /api/rates/bcv?date=YYYY-MM-DD */
  getBcvRates(date?: string): Observable<BcvRates> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<BcvRates>(`${API_BASE}/rates/bcv`, { params });
  }

  /** GET /api/receipts?tenant_id&year&month */
  list(q: ReceiptFilters = {}): Observable<Receipt[]> {
    let params = new HttpParams();
    if (q.tenant_id != null) params = params.set('tenant_id', q.tenant_id);
    if (q.year != null) params = params.set('year', q.year);
    if (q.month != null) params = params.set('month', q.month);
    return this.http.get<Receipt[]>(`${API_BASE}/receipts`, { params });
  }

  /** POST /api/receipts */
  create(dto: CreateReceiptDto): Observable<Receipt> {
    return this.http.post<Receipt>(`${API_BASE}/receipts`, dto);
  }

  /** POST /api/receipts/:id/whatsapp — envío a inquilino, propietario o ambos */
  sendWhatsapp(id: number, target: 'all' | 'inquilino' | 'propietario' = 'all'): Observable<{ sent: boolean; target: string }> {
    const params = new HttpParams().set('target', target);
    return this.http.post<{ sent: boolean; target: string }>(`${API_BASE}/receipts/${id}/whatsapp`, {}, { params });
  }

  /** GET /api/receipts/:id/pdf?copy=dual|inquilino|propietario */
  pdfUrl(id: number, copy: 'dual' | 'inquilino' | 'propietario' = 'dual'): string {
    return copy === 'dual'
      ? `${API_BASE}/receipts/${id}/pdf`
      : `${API_BASE}/receipts/${id}/pdf?copy=${copy}`;
  }
}
