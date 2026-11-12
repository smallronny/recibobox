import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { apiError } from './core/api-error';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, ReactiveFormsModule],
  templateUrl: './app.html',
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly isLoggedIn = this.auth.isLoggedIn;
  readonly currentUser = this.auth.currentUser;

  readonly showPasswordModal = signal(false);
  readonly passwordSaving = signal(false);
  readonly passwordError = signal('');
  readonly passwordSuccess = signal('');

  readonly passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  protected readonly links = [
    { path: '/recibos', label: 'Recibos' },
    { path: '/recibos/nuevo', label: 'Nuevo recibo' },
    { path: '/inquilinos', label: 'Inquilinos' },
  ];

  openPasswordModal(): void {
    this.passwordForm.reset();
    this.passwordError.set('');
    this.passwordSuccess.set('');
    this.showPasswordModal.set(true);
  }

  closePasswordModal(): void {
    this.showPasswordModal.set(false);
  }

  submitChangePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();

    if (newPassword !== confirmPassword) {
      this.passwordError.set('La nueva contraseña y la confirmación no coinciden');
      return;
    }

    this.passwordSaving.set(true);
    this.passwordError.set('');
    this.passwordSuccess.set('');

    this.auth.changePassword(currentPassword || '', newPassword || '').subscribe({
      next: res => {
        this.passwordSaving.set(false);
        this.passwordSuccess.set(res.message || 'Contraseña actualizada con éxito');
        this.passwordForm.reset();
        setTimeout(() => {
          this.closePasswordModal();
        }, 1500);
      },
      error: err => {
        this.passwordSaving.set(false);
        this.passwordError.set(apiError(err, 'Error al actualizar la contraseña'));
      },
    });
  }

  logout(): void {
    this.auth.logout();
  }
}
