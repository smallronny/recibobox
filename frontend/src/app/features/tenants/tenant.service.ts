import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../../core/api';
import { Tenant, TenantUpsert } from '../../core/models/tenant.model';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly http = inject(HttpClient);

  /** GET /api/tenants[?all=1] */
  list(all = false): Observable<Tenant[]> {
    return this.http.get<Tenant[]>(`${API_BASE}/tenants`, {
      params: all ? new HttpParams().set('all', '1') : undefined,
    });
  }

  get(id: number): Observable<Tenant> {
    return this.http.get<Tenant>(`${API_BASE}/tenants/${id}`);
  }

  create(data: TenantUpsert): Observable<Tenant> {
    return this.http.post<Tenant>(`${API_BASE}/tenants`, data);
  }

  update(id: number, data: Partial<TenantUpsert>): Observable<Tenant> {
    return this.http.put<Tenant>(`${API_BASE}/tenants/${id}`, data);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/tenants/${id}`);
  }
}
