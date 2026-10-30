import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TenantService } from './tenant.service';
import { apiError } from '../../core/api-error';
import { Tenant } from '../../core/models/tenant.model';

@Component({
  selector: 'app-tenant-list',
  imports: [RouterLink],
  templateUrl: './tenant-list.component.html',
})
export class TenantListComponent {
  private readonly tenantService = inject(TenantService);

  readonly tenants = signal<Tenant[] | null>(null);
  readonly error = signal('');

  constructor() {
    this.load();
  }

  load(): void {
    this.error.set('');
    this.tenantService.list(true).subscribe({
      next: list => this.tenants.set(list),
      error: () => this.error.set('No se pudo cargar la lista. ¿Está activo el backend?'),
    });
  }

  toggle(t: Tenant): void {
    this.tenantService.update(t.id, { is_active: !t.is_active }).subscribe({
      next: () => this.load(),
      error: e => this.error.set(apiError(e, 'No se pudo cambiar el estado.')),
    });
  }

  remove(t: Tenant): void {
    if (!window.confirm(`¿Eliminar a ${t.full_name}?`)) return;
    this.tenantService.remove(t.id).subscribe({
      next: () => this.load(),
      error: e => this.error.set(apiError(e, 'No se pudo eliminar.')),
    });
  }
}
