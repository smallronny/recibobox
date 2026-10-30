/**
 * Config de pm2 para la API de recibo-box.
 *
 * El deploy copia este archivo a {SERVER_APP_DIR}/backend/ecosystem.config.js;
 * pm2 lo ejecuta con cwd = su propia carpeta, por eso la app (dotenv) encuentra
 * el .env ahí y resuelve módulos subiendo a ../node_modules.
 *
 * En el servidor (solo la primera vez):
 *   sudo npm install -g pm2
 *   cd /opt/recibo-box/backend && pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup systemd      # ejecutarás un comando sudo que imprime (arranque al boot)
 *
 * Los deploys posteriores (GitHub Actions) hacen: pm2 reload recibo-box-api.
 */
module.exports = {
  apps: [
    {
      name: 'recibo-box-api',
      cwd: __dirname,               // {SERVER_APP_DIR}/backend (donde vive el .env)
      script: 'dist/index.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      env: { NODE_ENV: 'production' },
    },
  ],
};
