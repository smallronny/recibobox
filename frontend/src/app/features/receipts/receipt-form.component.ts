import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { finalize, take } from 'rxjs';
import { ReceiptService } from './receipt.service';
import { TenantService } from '../tenants/tenant.service';
import { CreateReceiptDto, MONTHS, Receipt } from '../../core/models/receipt.model';

const TODAY = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Component({
  selector: 'app-receipt-form',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './receipt-form.component.html',
})
export class ReceiptFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly receiptService = inject(ReceiptService);
  private readonly tenantService = inject(TenantService);

  readonly months = MONTHS;

  readonly form = this.fb.group({
    tenant_id: ['', Validators.required],
    period_month: [new Date().getMonth() + 1, Validators.required],
    period_year: [new Date().getFullYear(), Validators.required],
    issue_date: [TODAY, Validators.required],

    // Divisa USD (opcional)
    amount_usd: [0, [Validators.min(0)]],
    exchange_rate: [1, [Validators.min(0)]],

    // Divisa EURO (opcional)
    amount_eur: [0, [Validators.min(0)]],
    exchange_rate_eur: [1, [Validators.min(0)]],

    // Monto directo en Bs (si no se usan USD/EUR)
    amount_bs_manual: [0, [Validators.min(0)]],

    // IVA (opcional)
    apply_iva: [false],
    iva_rate: [16, [Validators.min(0), Validators.max(100)]],

    payment_reference: [''],
    send_whatsapp: [true],
  });

  readonly tenants = toSignal(this.tenantService.list(), { initialValue: [] });
  readonly saving = signal(false);
  readonly error = signal('');
  readonly saved = signal<Receipt | null>(null);

  // Estados de reintento WhatsApp
  readonly resendingInquilino = signal(false);
  readonly resendingPropietario = signal(false);
  readonly whatsappStatus = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estado de consulta BCV
  readonly loadingRates = signal(false);
  readonly ratesInfo = signal('');

  // Signals reactivos del formulario
  readonly amountUsd = toSignal(this.form.controls.amount_usd.valueChanges, { initialValue: 0 });
  readonly rateUsd = toSignal(this.form.controls.exchange_rate.valueChanges, { initialValue: 1 });
  readonly amountEur = toSignal(this.form.controls.amount_eur.valueChanges, { initialValue: 0 });
  readonly rateEur = toSignal(this.form.controls.exchange_rate_eur.valueChanges, { initialValue: 1 });
  readonly manualBs = toSignal(this.form.controls.amount_bs_manual.valueChanges, { initialValue: 0 });
  readonly applyIva = toSignal(this.form.controls.apply_iva.valueChanges, { initialValue: false });
  readonly ivaRateVal = toSignal(this.form.controls.iva_rate.valueChanges, { initialValue: 16 });

  // Cálculos dinámicos
  readonly bsFromUsd = computed(() => round2((Number(this.amountUsd()) || 0) * (Number(this.rateUsd()) || 0)));
  readonly bsFromEur = computed(() => round2((Number(this.amountEur()) || 0) * (Number(this.rateEur()) || 0)));

  // Total monto base en Bs (suma de Bs provenientes de USD y EUR, o monto manual)
  readonly amountBs = computed(() => {
    const usdBs = this.bsFromUsd();
    const eurBs = this.bsFromEur();
    const sum = round2(usdBs + eurBs);
    return sum > 0 ? sum : round2(Number(this.manualBs()) || 0);
  });

  readonly iva = computed(() => {
    if (!this.applyIva()) return 0;
    const rate = Number(this.ivaRateVal()) || 0;
    return round2(this.amountBs() * (rate / 100));
  });

  readonly total = computed(() => round2(this.amountBs() + this.iva()));

  constructor() {
    // Al cambiar la fecha de emisión, consultar tasas del BCV para esa fecha
    this.form.controls.issue_date.valueChanges.pipe(takeUntilDestroyed()).subscribe(date => {
      if (date) {
        this.fetchBcvRates(date);
      }
    });
  }

  ngOnInit(): void {
    // Carga inicial de tasas del BCV para la fecha de hoy
    this.fetchBcvRates(this.form.controls.issue_date.value ?? TODAY);
  }

  fetchBcvRates(date: string): void {
    this.loadingRates.set(true);
    this.ratesInfo.set('Consultando tasas del BCV…');

    this.receiptService
      .getBcvRates(date)
      .pipe(
        take(1),
        finalize(() => this.loadingRates.set(false)),
      )
      .subscribe({
        next: rates => {
          if (rates.usd > 0) {
            this.form.controls.exchange_rate.setValue(rates.usd);
          }
          if (rates.eur > 0) {
            this.form.controls.exchange_rate_eur.setValue(rates.eur);
          }
          this.ratesInfo.set(`Tasas BCV (${rates.date}): USD ${rates.usd} · EUR ${rates.eur}`);
        },
        error: () => {
          this.ratesInfo.set('No se pudieron consultar tasas automáticas del BCV. Puedes tiparlas manualmente.');
        },
      });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.amountBs() <= 0) {
      this.error.set('Debes ingresar al menos un monto válido en USD, EURO o Bs.');
      return;
    }

    const v = this.form.getRawValue();
    const dto: CreateReceiptDto = {
      tenant_id: Number(v.tenant_id),
      period_month: Number(v.period_month),
      period_year: Number(v.period_year),
      issue_date: String(v.issue_date),
      amount_bs: this.amountBs(),
      amount_usd: round2(Number(v.amount_usd) || 0),
      exchange_rate: Number(v.exchange_rate) || null,
      amount_eur: round2(Number(v.amount_eur) || 0),
      exchange_rate_eur: Number(v.exchange_rate_eur) || null,
      iva_rate: v.apply_iva ? Number(v.iva_rate) || 16 : 0,
      payment_reference: String(v.payment_reference ?? '').trim() || undefined,
    };

    this.saving.set(true);
    this.error.set('');
    this.receiptService
      .create(dto)
      .pipe(
        take(1),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: r => {
          this.saved.set(r);
          if (v.send_whatsapp) {
            this.receiptService
              .sendWhatsapp(r.id)
              .pipe(take(1))
              .subscribe({
                error: () => this.error.set('Recibo guardado, pero falló el envío por WhatsApp.'),
              });
          }
        },
        error: () => this.error.set('No se pudo guardar el recibo. Verifica que el backend esté activo.'),
      });
  }

  reset(): void {
    this.saved.set(null);
    this.error.set('');
    this.whatsappStatus.set(null);
    this.form.reset({
      tenant_id: '',
      period_month: new Date().getMonth() + 1,
      period_year: new Date().getFullYear(),
      issue_date: TODAY,
      amount_usd: 0,
      exchange_rate: 1,
      amount_eur: 0,
      exchange_rate_eur: 1,
      amount_bs_manual: 0,
      apply_iva: false,
      iva_rate: 16,
      payment_reference: '',
      send_whatsapp: true,
    });
    this.fetchBcvRates(TODAY);
  }

  sendWhatsappCopy(target: 'inquilino' | 'propietario'): void {
    const r = this.saved();
    if (!r) return;

    if (target === 'inquilino') {
      this.resendingInquilino.set(true);
    } else {
      this.resendingPropietario.set(true);
    }
    this.whatsappStatus.set(null);

    this.receiptService
      .sendWhatsapp(r.id, target)
      .pipe(
        take(1),
        finalize(() => {
          if (target === 'inquilino') this.resendingInquilino.set(false);
          else this.resendingPropietario.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.whatsappStatus.set({
            type: 'success',
            message: `Copia enviada por WhatsApp al ${target === 'inquilino' ? 'Inquilino' : 'Propietario'}.`,
          });
        },
        error: (err: any) => {
          this.whatsappStatus.set({
            type: 'error',
            message: `Falló el envío al ${target === 'inquilino' ? 'Inquilino' : 'Propietario'}: ${err?.error?.error || 'Revisa tus credenciales de WhatsApp.'}`,
          });
        },
      });
  }

  pdfUrl(id: number, copy: 'dual' | 'inquilino' | 'propietario' = 'dual'): string {
    return this.receiptService.pdfUrl(id, copy);
  }
}
