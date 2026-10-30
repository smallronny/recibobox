import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
})
export class App {
  protected readonly links = [
    { path: '/recibos', label: 'Recibos' },
    { path: '/recibos/nuevo', label: 'Nuevo recibo' },
    { path: '/inquilinos', label: 'Inquilinos' },
  ];
}
