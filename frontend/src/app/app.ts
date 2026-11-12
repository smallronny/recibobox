import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
})
export class App {
  private readonly auth = inject(AuthService);

  readonly isLoggedIn = this.auth.isLoggedIn;
  readonly currentUser = this.auth.currentUser;

  protected readonly links = [
    { path: '/recibos', label: 'Recibos' },
    { path: '/recibos/nuevo', label: 'Nuevo recibo' },
    { path: '/inquilinos', label: 'Inquilinos' },
  ];

  logout(): void {
    this.auth.logout();
  }
}
