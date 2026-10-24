# OmniMarket Operations Hub — Frontend

Dashboard analítico de e-commerce con Kanban (Drag & Drop + mutación optimista) y autenticación OAuth (Google/GitHub). UI en español (es-MX), moneda MXN.

**Stack:** Next.js 15 (App Router) · TypeScript strict · Tailwind CSS v4 · shadcn/ui · Aceternity UI · motion · dnd-kit · recharts · SWR · react-hook-form + Zod · Auth.js v5 · Vitest · Playwright.

## Puesta en marcha

```bash
cp .env.example .env.local     # rellena AUTH_* ; NEXT_PUBLIC_USE_MOCKS=true para desarrollar sin backend
npm install
npm run dev
```

| Script | Qué hace |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (unitarias: formateadores, finanzas, Decimal, schemas Zod, agregaciones, Kanban) |
| `npm run test:e2e` | Playwright (auth, crear orden, DnD + persistencia, rollback, bulk, 409) |

## Rutas

| Ruta | Acceso | Contenido |
|---|---|---|
| `/` | pública | Landing: hero con Webcam Pixel Grid (+ fallback ambiental), stack, preview, features, órdenes, CTA |
| `/login` | pública | Sólo “Continuar con Google / GitHub”. Toasts para `?error=` |
| `/dashboard` | protegida | KPIs, barra segmentada por categoría, ingresos por día, últimas órdenes |
| `/dashboard/analytics` | protegida | Filtros, gráficas y tabla paginada en servidor (`?page=&limit=`) con latencia |
| `/dashboard/kanban` | protegida | 5 columnas `OrderStatus`, DnD, rollback, bulk atómico, crear orden |

Protección doble: `middleware.ts` (sólo presencia de cookie, edge) + `auth()` en `app/dashboard/layout.tsx`.

## Capa de datos (`lib/api/`)

- `schemas.ts`: contrato con Zod; **toda** respuesta se parsea en la frontera (`client.ts`). Los `Decimal` llegan como string y se convierten con `lib/decimal.ts`.
- `transport.ts`: HTTP real o adaptador mock según `NEXT_PUBLIC_USE_MOCKS`.
- `mock/`: backend simulado en el navegador (persistido en `localStorage`, versión optimista, 409, bulk atómico, botón “Simular fallo” para ver el rollback). **En producción debe ser `false`.**

### Contrato asumido — a confirmar con backend

| Endpoint | Request | Response |
|---|---|---|
| `GET /api/test/analytics` | `page`, `limit` (≤ 500) **+ opcionales `from`, `to` (YYYY-MM-DD), `categoryId`** | `{ data: [{ day, categoryId, categoryName, ordersCount, revenue, avgTicket, grossMargin }], meta: { total, page, pageSize, totalPages } }` |
| `GET /api/test/kanban-status` | — | `{ columns: [{ status, count, cards: [{ id, orderNumber, customerName, total, margin, position, version, status, updatedAt? }] }] }` |
| `POST /api/test/reset-data` | — | `{ ok: true, message }` |
| `PATCH /api/orders/:id/move` | `{ toStatus, toPosition, version }` | tarjeta actualizada (con `version` nueva). `409` si `version` no coincide |
| `POST /api/orders` | `{ customerName, customerEmail?, items: [{ productId, quantity }], status }` | tarjeta creada |
| `POST /api/orders/bulk` | `{ ids, patch: { status } }` (transacción) | `{ updated }` |

Puntos abiertos para backend:
1. Filtros `from`/`to`/`categoryId` en `/api/test/analytics` y límite máximo (el front usa `limit=500` para las gráficas; ideal: un endpoint de resumen agregado).
2. `margin` en la tarjeta = margen bruto **absoluto** (Decimal); el % lo calcula el front.
3. `updatedAt` opcional en tarjetas (para el “hace 5 min”).
4. `toPosition` = índice 0-based dentro de la columna destino; el backend reordena el resto.
5. Formato de error: `{ error }` o `{ message }`.
6. Catálogo de productos: hoy está en `lib/catalog.ts`; se necesita `GET /api/products`.
7. Rol de usuario: hoy se asigna “Operador” en el callback JWT; debería venir de la BD.

## CI/CD

`.github/workflows/ci.yml` ejecuta lint, typecheck, unitarias, build y E2E. En Railway activa **“Wait for CI”** para que un fallo bloquee el despliegue.
