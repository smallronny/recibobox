import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs';
import { TenantService } from './tenant.service';
import { apiError } from '../../core/api-error';
import { DOC_TYPES, Tenant } from '../../core/models/tenant.model';

@Component({
  selector: 'app-tenant-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './tenant-form.component.html',
})
export class TenantFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tenantService = inject(TenantService);

  readonly docTypes = DOC_TYPES;
  readonly saving = signal(false);
  readonly error = signal('');
  readonly editing = signal(false);

  readonly form = this.fb.group({
    full_name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    doc_type: ['V' as string],
    doc_number: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(20)]],
    phone: ['', [Validators.required, Validators.pattern(/^\+?\d{6,19}$/)]],
    local_number: ['', [Validators.required, Validators.maxLength(20)]],
    is_active: [true],
  });

  private readonly id = Number(this.route.snapshot.paramMap.get('id')) || 0;

  constructor() {
    if (this.id) {
      this.editing.set(true);
      this.tenantService
        .get(this.id)
        .pipe(take(1))
        .subscribe({
          next: (t: Tenant) =>
            this.form.patchValue({
              full_name: t.full_name,
              doc_type: t.doc_type,
              doc_number: t.doc_number,
              phone: t.phone,
              local_number: t.local_number,
              is_active: t.is_active,
            }),
          error: () => this.error.set('Inquilino no encontrado.'),
        });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue() as Record<string, unknown>;
    const data = {
      full_name: String(v['full_name']).trim(),
      doc_type: String(v['doc_type']) as import('../../core/models/tenant.model').DocType,
      doc_number: String(v['doc_number']).trim().toUpperCase(),
      phone: String(v['phone']).trim(),
      local_number: String(v['local_number']).trim(),
      is_active: Boolean(v['is_active']),
    };

    this.saving.set(true);
    this.error.set('');
    const call = this.id
      ? this.tenantService.update(this.id, data)
      : this.tenantService.create(data);

    call.pipe(take(1)).subscribe({
      next: () => this.router.navigate(['/inquilinos']),
      error: e => {
        this.error.set(apiError(e, 'No se pudo guardar el inquilino.'));
        this.saving.set(false);
      },
    });
  }
}
