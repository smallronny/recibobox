#!/usr/bin/env bash
#
# Pasa en el servidor y lo ejecuta el workflow:
#   ssh … "bash -s -- '$APP_DIR'" < deploy/server-deploy.sh
#
# Hace:
#   1. Verifica requisitos (pm2, curl, .env de la API)
#   2. pm2 start (primer deploy) o pm2 reload (deploys siguientes) + pm2 save
#   3. Health check local http://127.0.0.1:$PORT/api/health con reintentos
#   4. Si falla: imprime pm2 status y los últimos logs de la API

set -euo pipefail

APP_DIR="${1:?Falta la ruta de la app (APP_DIR)}"
API_DIR="$APP_DIR/backend"
APP_NAME="recibo-box-api"

die() { echo "::error::$*" >&2; exit 1; }

command -v pm2  >/dev/null 2>&1 || die "pm2 no está instalado: sudo npm install -g pm2 (README: Preparación del VPS)"
command -v curl >/dev/null 2>&1 || die "curl no está instalado: sudo apt install curl"

[ -d "$API_DIR" ]              || die "$API_DIR no existe (¿falló el rsync?)"
[ -d "$APP_DIR/node_modules" ] || die "Falta $APP_DIR/node_modules (¿falló el rsync?)"
[ -f "$API_DIR/.env" ]         || die "Falta $API_DIR/.env — en el servidor: cp $API_DIR/.env.example $API_DIR/.env && edítalo (README: Variables de entorno)"
[ -f "$API_DIR/ecosystem.config.js" ] || die "Falta $API_DIR/ecosystem.config.js (¿falló el rsync?)"

# Puerto de la API: valor de PORT, si no APP_PORT, si no 3000
port_from_env() {
  # grep sale 1 si la clave no existe → "|| true" evita el set -e abortando
  grep -E "^$1=" "$API_DIR/.env" | tail -n1 | cut -d= -f2- | tr -d '[:space:]' || true
}
PORT="$(port_from_env PORT)"
PORT="${PORT:-$(port_from_env APP_PORT)}"
PORT="${PORT:-3000}"

cd "$API_DIR"
mkdir -p logs tmp

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  echo "↻ pm2 reload $APP_NAME"
  pm2 reload "$APP_NAME" --update-env
else
  echo "● pm2 start $APP_NAME (primer deploy)"
  pm2 start ecosystem.config.js
fi
pm2 save

# Health check (hasta 60 s de reintentos)
ok=""
for _ in $(seq 1 12); do
  if curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then ok=1; break; fi
  sleep 5
done

if [ -z "$ok" ]; then
  echo "::error::La API no responde en http://127.0.0.1:$PORT/api/health tras el reload"
  echo "--- pm2 status $APP_NAME ---"
  pm2 status "$APP_NAME" || true
  echo "--- logs recientes ---"
  pm2 logs "$APP_NAME" --lines 40 --nostream || tail -n 40 logs/error.log
  exit 1
fi

echo "✔ health ok: GET http://127.0.0.1:$PORT/api/health (APP_PORT=$PORT)"
pm2 status "$APP_NAME"
