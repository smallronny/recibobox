import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../../core/api';
import { CreateReceiptDto, Receipt } from '../../core/models/receipt.model';

export interface ReceiptFilters {
  tenant_id?: number | null;
  year?: number | null;
  month?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ReceiptService {
  private readonly http = inject(HttpClient);

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

  /** POST /api/receipts/:id/whatsapp — envío con copia al administrador */
  sendWhatsapp(id: number): Observable<void> {
    return this.http.post<void>(`${API_BASE}/receipts/${id}/whatsapp`, {});
  }

  /** GET /api/receipts/:id/pdf — PDF dual (inquilino / propietario) */
  pdfUrl(id: number): string {
    return `${API_BASE}/receipts/${id}/pdf`;
  }
}
