import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Observable, finalize, startWith, switchMap, take } from 'rxjs';
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
  readonly pdfUrl = (id: number, copy: 'dual' | 'inquilino' | 'propietario' = 'dual') =>
    this.receiptService.pdfUrl(id, copy);

  // Estados de envío por WhatsApp
  readonly sending = signal<{ [key: string]: boolean }>({});
  readonly feedback = signal<{ [key: number]: { text: string; isError: boolean } }>({});

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

  isSending(receiptId: number, target: 'inquilino' | 'propietario'): boolean {
    return Boolean(this.sending()[`${receiptId}_${target}`]);
  }

  sendWhatsapp(r: Receipt, target: 'inquilino' | 'propietario'): void {
    const key = `${r.id}_${target}`;
    this.sending.update(s => ({ ...s, [key]: true }));

    this.receiptService
      .sendWhatsapp(r.id, target)
      .pipe(
        take(1),
        finalize(() => {
          this.sending.update(s => ({ ...s, [key]: false }));
        }),
      )
      .subscribe({
        next: () => {
          if (target === 'inquilino') {
            r.whatsapp_sent = true;
          }
          this.setFeedback(r.id, `Enviado al ${target === 'inquilino' ? 'Inquilino' : 'Propietario'}`, false);
        },
        error: (err: any) => {
          this.setFeedback(
            r.id,
            `Error (${target}): ${err?.error?.error || 'Revisa configuración WhatsApp'}`,
            true,
          );
        },
      });
  }

  private setFeedback(receiptId: number, text: string, isError: boolean): void {
    this.feedback.update(f => ({ ...f, [receiptId]: { text, isError } }));
    setTimeout(() => {
      this.feedback.update(f => {
        const copy = { ...f };
        delete copy[receiptId];
        return copy;
      });
    }, 4500);
  }
}
