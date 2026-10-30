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
