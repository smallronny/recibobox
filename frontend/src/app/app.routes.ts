import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'recibos' },
  {
    path: 'recibos',
    loadComponent: () =>
      import('./features/receipts/receipt-list.component').then(m => m.ReceiptListComponent),
  },
  {
    path: 'recibos/nuevo',
    loadComponent: () =>
      import('./features/receipts/receipt-form.component').then(m => m.ReceiptFormComponent),
  },
  {
    path: 'inquilinos/nuevo',
    loadComponent: () =>
      import('./features/tenants/tenant-form.component').then(m => m.TenantFormComponent),
  },
  {
    path: 'inquilinos/:id',
    loadComponent: () =>
      import('./features/tenants/tenant-form.component').then(m => m.TenantFormComponent),
  },
  {
    path: 'inquilinos',
    loadComponent: () =>
      import('./features/tenants/tenant-list.component').then(m => m.TenantListComponent),
  },
  { path: '**', redirectTo: 'recibos' },
];
