# recibo-box

Monorepo con [npm workspaces](https://docs.npmjs.com/cli/v11/using-npm/workspaces):

| Paquete | Ruta | Stack |
| --- | --- | --- |
| `recibo-box-backend` | `backend/` | Node + Express + TypeORM + MySQL |
| `recibo-box` | `frontend/` | Angular 21 + Tailwind CSS 4 |

## Estructura

```
.
├── backend/          # API + generación de PDF + WhatsApp
├── frontend/         # App Angular
├── .github/          # workflows (deploy a VPS con pm2 + nginx)
├── .gitignore        # Reglas únicas para todo el repo (secretos, builds, IDEs)
└── package.json      # Workspaces y scripts raíz
```

## Scripts raíz

```bash
npm run dev:backend     # tsx watch (puerto 3000)
npm run dev:frontend    # ng serve
npm run build           # build de ambos paquetes
npm run db:init         # inicializa el esquema MySQL
```

Los scripts también pueden ejecutarse apuntando a un paquete con `npm run <script> -w backend` o `-w frontend`.

## Notas

- Los secretos viven en `backend/.env` (ignorado por git); plantilla en `backend/.env.example`.
- Hay un único `package-lock.json` en la raíz; haz `npm install` desde aquí, no desde los paquetes.

## Despliegue a VPS (GitHub Actions + pm2 + nginx)

`.github/workflows/deploy.yml` hace build del backend (tsc) y del frontend
(Angular), instala dependencias de producción y publica por **rsync/SSH** a un
servidor Linux en cada push a `main` (o manual con *Actions → Deploy VPS →
Run workflow*):

| Paquete | Destino en el servidor | Cómo se sirve |
| --- | --- | --- |
| `frontend` (Angular) | `$APP_DIR/web/` | nginx, estático + fallback SPA (raíz del dominio) |
| `backend` (Node/Express `dist/` + node_modules prod) | `$APP_DIR/backend/` | pm2 (proceso `recibo-box-api`) y nginx proxyea `/api` → `127.0.0.1:$APP_PORT` |

`$APP_DIR` es la variable `SERVER_APP_DIR` (por defecto `/opt/recibo-box`).
Tras el rsync, el workflow ejecuta `deploy/server-deploy.sh` en el servidor:
`pm2 reload`/`start`, `pm2 save` y un health check local de
`/api/health`; si no responde, el workflow falla mostrando los logs de pm2.

### Configuración en GitHub (repo → Settings → Secrets and variables → Actions)

En la pestaña **Variables**:

| Nombre | Ejemplo | Uso |
| --- | --- | --- |
| `SITE_URL` | `https://tudominio.com` | Dominio público (obligatoria). La API se inyecta en el frontend como `${SITE_URL}/api` en build time |
| `SERVER_APP_DIR` | `/opt/recibo-box` | Ruta de la app en el servidor (por defecto `/opt/recibo-box`) |
| `SSH_PORT` | `22` | Puerto SSH del servidor (por defecto `22`) |

En la pestaña **Secrets**:

| Nombre | Valor |
| --- | --- |
| `SSH_HOST` | IP o dominio del servidor (ej. `203.0.113.10`) |
| `SSH_USER` | Usuario que puede escribir en `$APP_DIR` (ideal una cuenta de deploy) |
| `SSH_PRIVATE_KEY` | Contenido **completo** de la clave privada, sin passphrase |

Generar la clave (en tu máquina) y autorizarla en el servidor:

```bash
ssh-keygen -t ed25519 -C "github-actions deploy" -N "" -f ~/.ssh/recibo_box_deploy
ssh-copy-id -i ~/.ssh/recibo_box_deploy.pub deploy@SERVIDOR
# pega el contenido de ~/.ssh/recibo_box_deploy en el secreto SSH_PRIVATE_KEY
```

### Preparación única del servidor (Ubuntu/Debian)

1. **Paquetes base**:

   ```bash
   sudo apt update && sudo apt install -y nginx rsync curl mysql-server
   ```

2. **Node 20.19+ (recomendado 22.x)**:

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

3. **pm2 y arranque al boot**:

   ```bash
   sudo npm install -g pm2
   pm2 startup systemd   # ejecuta el comando sudo que imprime
   ```

4. **Carpeta de la app** (dueño = `SSH_USER`, el deploy escribe ahí):

   ```bash
   sudo mkdir -p /opt/recibo-box && sudo chown -R "$USER" /opt/recibo-box
   ```

5. **MySQL y esquema**: crea la BD y el usuario, importa
   `backend/sql/schema.sql` (tras el primer deploy queda en
   `$APP_DIR/backend/sql/`) con `mysql -u USER -p NOMBRE_BD < schema.sql`.

6. **Variables de entorno de la API** — el deploy **no** sube `.env`; créalo
   una vez en el servidor (plantilla: `backend/.env.example`):

   ```bash
   cp /opt/recibo-box/backend/.env.example /opt/recibo-box/backend/.env
   nano /opt/recibo-box/backend/.env   # APP_PORT, DB_*, WHATSAPP_TOKEN, ...
   ```

7. **nginx** (desde tu máquina copia el conf al servidor y actívalo allí):

   ```bash
   scp deploy/nginx/recibo-box.conf SSH_USER@SERVIDOR:/tmp/recibo-box.conf
   ssh SSH_USER@SERVIDOR
   sudo mv /tmp/recibo-box.conf /etc/nginx/sites-available/recibo-box.conf
   sudo nano /etc/nginx/sites-available/recibo-box.conf   # cambia tudominio.com
   sudo ln -sfn /etc/nginx/sites-available/recibo-box.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d tudominio.com   # TLS con Let's Encrypt
   ```

8. **Firewall**: solo `22`, `80` y `443`. La API escucha en `127.0.0.1`
   (no expongas el puerto de la app).

### Verificación

- API: `https://tudominio.com/api/health` → `{"ok": true}`.
- Web: `https://tudominio.com/`.
- En el servidor: `pm2 status`, `pm2 logs recibo-box-api`, logs también en
  `$APP_DIR/backend/logs/{out,error}.log`.

### Troubleshooting

- **Health check falla tras el deploy**: revisa `pm2 logs recibo-box-api
  --lines 40`; las causas típicas son credenciales de MySQL mal escritas en
  `$APP_DIR/backend/.env` o que no se importó el esquema.
- **502 Bad Gateway en `/api`**: pm2 está caído (`pm2 status`; reinícialo con
  `pm2 start $APP_DIR/backend/ecosystem.config.js`) o `APP_PORT` del `.env`
  no coincide con el `proxy_pass` de nginx.
- **404 en la web**: nginx debe apuntar `root` a `$APP_DIR/web`; si el
  `SERVER_APP_DIR` es distinto, ajusta el `root` del conf.
- **403 en la web**: permisos de lectura; usa `chmod -R go+rX $APP_DIR/web`.
- **Clave SSH rechazada**: verifica que `authorized_keys` del `SSH_USER`
  contenga la clave pública correspondiente y que la clave privada no tenga
  passphrase.
- **rsync falta en el servidor**: `sudo apt install rsync`.
- **Dependencias nativas nuevas**: actualmente todas las deps del backend son
  JS puro, por eso `node_modules` se construye en el runner de CI. Si agregas
  un paquete con binarios nativos (bcrypt, sharp…), compila/instala en el
  servidor o préstale atención a la compatibilidad de plataforma.
- **Cambios del backend sin variación en la web con caché**: los assets de
  Angular van con hash; si te salen versiones viejas, fuerza recarga y verifica
  que nginx sirve `$APP_DIR/web` (no una caché intermedia).
