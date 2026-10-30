/**
 * URL base del backend Express.
 *
 * En producción la inyecta GitHub Actions en build time mediante la opción
 * `define` de angular.json (constante global APP_API_BASE); ver
 * `.github/workflows/deploy.yml`. En desarrollo cae al backend local.
 */
declare const APP_API_BASE: string | undefined;

export const API_BASE: string =
  typeof APP_API_BASE === 'string' ? APP_API_BASE : 'http://localhost:3000/api';
