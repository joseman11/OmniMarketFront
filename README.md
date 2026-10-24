# OmniMarket Operations Hub — Frontend

Dashboard en español para operaciones de e-commerce: analítica, Kanban con arrastre y actualización optimista, y acceso OAuth con Google/GitHub. La sesión y los datos pertenecen al backend.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · dnd-kit · Recharts · SWR · React Hook Form · Zod · Vitest · Playwright.

## Desarrollo local

Configura primero y arranca PostgreSQL y la API siguiendo el README de `OmniMarketBack`. Para OAuth local, registra estos callbacks en Google y GitHub:

- `http://localhost:3000/api/auth/google/callback`
- `http://localhost:3000/api/auth/github/callback`

En `OmniMarketBack/.env`, configura `API_ORIGIN=http://localhost:3000`, `WEB_ORIGIN=http://localhost:3000` y las credenciales `GOOGLE_*` y `GITHUB_*`. Después, desde esta carpeta:

```bash
cp .env.example .env.local
npm install
npm run dev
```

En Windows (PowerShell): `Copy-Item .env.example .env.local`; si la política de ejecución bloquea `npm`, usa `npm.cmd`.

`OMNIMARKET_API_URL` apunta al servicio backend (por defecto `http://localhost:3001`). Next.js reenvía OAuth por `/api/auth/*` y las llamadas de datos por `/backend/*`; las cookies quedan en el mismo origen del frontend. No configures `DATABASE_URL` aquí.

| Script | Uso |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unitarias: formatos, finanzas, schemas, analítica y Kanban |
| `npm run test:e2e` | Playwright con backend mock local y autenticación de prueba aislada |
| `npm run test:cypress` | Cypress (levanta el dev server en :3100 y corre `cypress run`); `npm run cypress` lo abre en modo interactivo |

## Rutas

| Ruta | Acceso | Contenido |
|---|---|---|
| `/` | Pública | Landing de producto |
| `/login` | Pública | Acceso con Google o GitHub |
| `/dashboard` | Sesión backend | Resumen de métricas y órdenes |
| `/dashboard/analytics` | Sesión backend | Gráficas, filtros por fecha/categoría y tabla paginada |
| `/dashboard/kanban` | Sesión backend | Cinco estados, arrastre, bulk y creación de órdenes |
| `/dashboard/catalog` | Sesión backend | Productos y categorías; lectura para usuarios y gestión para administradores |
| `/dashboard/orders/:id` | Sesión backend | Detalle, edición versionada de artículos y eliminación de una orden |

`middleware.ts` comprueba la presencia de `omni_session`; el layout consulta `GET /api/auth/session` al backend antes de renderizar el dashboard. OAuth, lectura y cierre de sesión usan la cookie HttpOnly del backend. Google y GitHub se configuran únicamente en el backend.

## Contrato integrado

`lib/api/client.ts` valida las respuestas con Zod y adapta el contrato del backend a los modelos de pantalla.

| Operación | Contrato que usa el frontend |
|---|---|
| Analítica | `GET /api/analytics?page&limit&from&to&categoryId`; responde `summary`, `items` con `category` anidada y `pagination` |
| Tablero | `GET /api/orders?page&limit`; el cliente consulta todas las páginas y agrupa órdenes por estado |
| Catálogo | `GET /api/categories` y `GET /api/products`; la vista de administración cubre alta, edición, detalle y eliminación de productos/categorías |
| Mover orden | `PATCH /api/orders/:id/status` con `{ status, position, expectedVersion }`; conflicto optimista HTTP 409 |
| Crear orden | `POST /api/orders` con `{ customer: { name, email }, items }`; el backend crea en `PENDING` |
| Detalle de orden | `GET /api/orders/:id`; edición de artículos con `PATCH /api/orders/:id` y `expectedVersion`; eliminación con `DELETE /api/orders/:id` |
| Bulk | `PATCH /api/orders/bulk` con `{ ids, status }`; máximo 100 órdenes por transacción |
| Auditoría | `GET /api/health`, `GET /api/test/analytics`, `GET /api/test/kanban-status` y `GET /api/test/contract` |
| Reset de fixtures | `POST /api/test/reset-data`; el navegador lo invoca mediante una ruta servidor que exige `TEST_RESET_ENABLED=true` (despliegue de fixtures) y comprueba origen, sesión ADMIN y `TEST_API_TOKEN`; sin el interruptor responde 404 |

`NEXT_PUBLIC_USE_MOCKS=true` habilita el adaptador local para desarrollo visual y E2E (siempre sobre `next dev`); en Railway/Vercel debe ser `false`. Un build o arranque con `NODE_ENV=production` falla si `NEXT_PUBLIC_USE_MOCKS` o `E2E_MOCK_AUTH` están en `true` (`lib/env-guard.ts`). La sesión E2E sólo se acepta con `E2E_MOCK_AUTH=true` y el modo de pruebas explícito `OMNIMARKET_TEST_ENV=true`, que fijan `playwright.config.ts`, `npm run test:cypress` y la CI. Las mutaciones reales envían credenciales incluidas para la cookie HttpOnly. El token de reset es solo de servidor y no debe llevar prefijo `NEXT_PUBLIC_`.

## Railway y CI/CD

Conecta cada repositorio al servicio Railway correspondiente y deja que GitHub Actions valide lint, tipos, unitarias, build y E2E antes del despliegue. En el servicio frontend configura:

- `OMNIMARKET_API_URL`: URL del backend accesible desde el servidor Next.js; usa la URL privada de Railway cuando esté disponible.
- `NEXT_PUBLIC_USE_MOCKS=false`.
- `TEST_API_TOKEN`: mismo valor privado que en backend, solo si se necesita habilitar el reset de fixtures.
- `TEST_RESET_ENABLED=true`: interruptor explícito del reset de fixtures; déjalo sin definir en producción.

En backend, configura `API_ORIGIN` y `WEB_ORIGIN` con el origen público del frontend. Registra Google/GitHub con callback `https://<dominio-frontend>/api/auth/{google|github}/callback`, y permite ese origen en CORS mediante `WEB_ORIGIN` o `CORS_ALLOWED_ORIGINS`. En Railway activa **Wait for CI**.

La configuración de variables no prueba que los proveedores OAuth, la base PostgreSQL o los servicios Railway estén provisionados; valida cada flujo en el entorno después de configurarlos.
