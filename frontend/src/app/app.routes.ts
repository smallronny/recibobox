import type { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'recibos' },
  {
    path: 'recibos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/receipts/receipt-list.component').then(m => m.ReceiptListComponent),
  },
  {
    path: 'recibos/nuevo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/receipts/receipt-form.component').then(m => m.ReceiptFormComponent),
  },
  {
    path: 'inquilinos/nuevo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/tenants/tenant-form.component').then(m => m.TenantFormComponent),
  },
  {
    path: 'inquilinos/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/tenants/tenant-form.component').then(m => m.TenantFormComponent),
  },
  {
    path: 'inquilinos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/tenants/tenant-list.component').then(m => m.TenantListComponent),
  },
  { path: '**', redirectTo: 'recibos' },
];
