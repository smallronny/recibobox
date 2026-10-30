import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { finalize, take } from 'rxjs';
import { ReceiptService } from './receipt.service';
import { TenantService } from '../tenants/tenant.service';
import { CreateReceiptDto, MONTHS, Receipt } from '../../core/models/receipt.model';

const TODAY = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
const IVA_RATE = 16; // % IVA (el backend/BD aplica el default 16 sobre Bs.)
const round2 = (n: number) => Math.round(n * 100) / 100;

@Component({
  selector: 'app-receipt-form',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './receipt-form.component.html',
})
export class ReceiptFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly receiptService = inject(ReceiptService);
  private readonly tenantService = inject(TenantService);

  readonly months = MONTHS;

  readonly form = this.fb.group({
    tenant_id: ['', Validators.required],
    period_month: [new Date().getMonth() + 1, Validators.required],
    period_year: [new Date().getFullYear(), Validators.required],
    issue_date: [TODAY, Validators.required],
    amount_usd: [0, Validators.min(0)],
    exchange_rate: [1, Validators.min(0)],
    amount_bs: [0, Validators.min(0)],
    payment_reference: [''],
    send_whatsapp: [true],
  });

  readonly tenants = toSignal(this.tenantService.list(), { initialValue: [] });
  readonly saving = signal(false);
  readonly error = signal('');
  readonly saved = signal<Receipt | null>(null);

  /** Totales dinámicos sobre Bs. (IVA fijo 16%). */
  readonly amountBs = toSignal(this.form.controls.amount_bs.valueChanges, { initialValue: 0 });
  readonly iva = computed(() => round2((this.amountBs() ?? 0) * (IVA_RATE / 100)));
  readonly total = computed(() => round2((this.amountBs() ?? 0) + this.iva()));

  /** Sincronización bidireccional Bs <-> USD según la tasa, respetando el último campo editado. */
  private syncing = false;
  private lastEdit: 'usd' | 'bs' | null = null;

  constructor() {
    const { amount_usd, amount_bs, exchange_rate } = this.form.controls;

    amount_usd.valueChanges.pipe(takeUntilDestroyed()).subscribe(usd => {
      if (this.syncing) return;
      this.lastEdit = 'usd';
      const rate = Number(exchange_rate.value) || 0;
      if (rate > 0) this.setControl(amount_bs, round2((usd ?? 0) * rate));
    });

    amount_bs.valueChanges.pipe(takeUntilDestroyed()).subscribe(bs => {
      if (this.syncing) return;
      this.lastEdit = 'bs';
      const rate = Number(exchange_rate.value) || 0;
      if (rate > 0) this.setControl(amount_usd, round2((bs ?? 0) / rate));
    });

    exchange_rate.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.syncing || !this.lastEdit) return;
      const rate = Number(exchange_rate.value) || 0;
      if (rate <= 0) return;
      if (this.lastEdit === 'usd') {
        this.setControl(amount_bs, round2((Number(amount_usd.value) || 0) * rate));
      } else {
        this.setControl(amount_usd, round2((Number(amount_bs.value) || 0) / rate));
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue() as Record<string, unknown>;
    const dto: CreateReceiptDto = {
      tenant_id: Number(v['tenant_id']),
      period_month: Number(v['period_month']),
      period_year: Number(v['period_year']),
      issue_date: String(v['issue_date']),
      amount_usd: round2(Number(v['amount_usd']) || 0),
      amount_bs: round2(Number(v['amount_bs']) || 0),
      exchange_rate: Number(v['exchange_rate']) || 0,
      payment_reference: String(v['payment_reference'] ?? '').trim() || undefined,
    };

    this.saving.set(true);
    this.error.set('');
    this.receiptService
      .create(dto)
      .pipe(take(1), finalize(() => this.saving.set(false)))
      .subscribe({
        next: r => {
          this.saved.set(r);
          if (v['send_whatsapp']) {
            this.receiptService.sendWhatsapp(r.id).pipe(take(1)).subscribe({
              error: () => this.error.set('Recibo guardado, pero falló el envío por WhatsApp.'),
            });
          }
        },
        error: () => this.error.set('No se pudo guardar el recibo. Verifica que el backend esté activo.'),
      });
  }

  /** Vuelve al formulario limpio tras emitir un recibo. */
  reset(): void {
    this.saved.set(null);
    this.error.set('');
    this.lastEdit = null;
    this.form.reset({
      tenant_id: '',
      period_month: new Date().getMonth() + 1,
      period_year: new Date().getFullYear(),
      issue_date: TODAY,
      amount_usd: 0,
      exchange_rate: 1,
      amount_bs: 0,
      payment_reference: '',
      send_whatsapp: true,
    });
  }

  pdfUrl(id: number): string {
    return this.receiptService.pdfUrl(id);
  }

  private setControl(control: AbstractControl, value: number): void {
    this.syncing = true;
    control.setValue(value);
    this.syncing = false;
  }
}
