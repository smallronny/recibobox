import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Observable, startWith, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { TenantService } from '../tenants/tenant.service';
import { ReceiptService, type ReceiptFilters } from './receipt.service';
import { MONTHS, Receipt } from '../../core/models/receipt.model';

@Component({
  selector: 'app-receipt-list',
  imports: [ReactiveFormsModule, DecimalPipe, RouterLink],
  templateUrl: './receipt-list.component.html',
})
export class ReceiptListComponent {
  private readonly receiptService = inject(ReceiptService);
  private readonly tenantService = inject(TenantService);

  readonly months = MONTHS;
  readonly tenants = toSignal(this.tenantService.list(), { initialValue: [] });
  readonly pdfUrl = (id: number) => this.receiptService.pdfUrl(id);

  /** Cada cambio de filtro reconsulta la API automáticamente (switchMap cancela lo pendiente). */
  readonly filterForm = inject(FormBuilder).group({
    tenant_id: [''],
    year: [new Date().getFullYear()],
    month: [''],
  });

  readonly receipts = toSignal(
    (this.filterForm.valueChanges as Observable<Record<string, unknown>>).pipe(
      startWith(this.filterForm.value as Record<string, unknown>),
      switchMap(v => {
        const q: ReceiptFilters = {
          tenant_id: Number(v['tenant_id']) || null,
          year: Number(v['year']) || null,
          month: Number(v['month']) || null,
        };
        return this.receiptService.list(q);
      }),
    ),
    { initialValue: null as unknown as Receipt[] },
  );

  monthName(m: number): string {
    return MONTHS[m - 1]?.label ?? '';
  }
}
