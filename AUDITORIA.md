# Auditoría Frontend & Seguridad — OmniMarketFront

> **Stack:** Next.js 15.5 (App Router, Turbopack) · React 19 · Tailwind 4 · Auth.js v5 · SWR · Zod · dnd-kit · Vitest + Playwright
> **Alcance:** ~10.8k LOC en `app/`, `components/`, `lib/`, `hooks/`
> **Rol:** Staff Frontend Engineer + Auditor de Seguridad
> **Fecha:** 2026-10-24

---

## Resumen ejecutivo

| Severidad | # | Ámbito |
|---|---|---|
| Crítico | 3 | open-redirect post-login, panel destructivo sin autorización, mock manipulable en prod |
| Alto | 4 | canvas 60 fps + getUserMedia sin gesto, 59 animaciones en login, forced reflow continuo, duplicación de DOM |
| Medio | 4 | timers sin cleanup, `aria-hidden-focus`, hidratación de fecha, carreras de datos |
| Pruebas | — | 0 cobertura sobre `client`/`transport`/auth-guard y edge cases de DnD |

**Lo bueno verificado:** no hay XSS directo (`dangerouslySetInnerHTML`/`eval` ausentes), el JSON del viewer se renderiza como texto, los schemas Zod en la frontera API son sólidos, el rollback del kanban no pisa mutaciones concurrentes (`pendingRef`/`originRef` bien pensados) y `middleware.ts` está correctamente complementado por `auth()` en el layout.

---

## 1. Hallazgos críticos

### [CRÍTICO · Seguridad] `app/login/actions.ts:14-17` — Open redirect en `safeCallback`

El guard solo bloquea `//`, pero **no normaliza backslashes ni percent-encoding**. `/\evil.com` o `/%5cevil.com` pasan el check; los navegadores convierten `\`→`/` y el usuario queda redirigido a un dominio externo tras el OAuth → phishing post-login y robo del `code` OAuth.

**Vectores de prueba:**

1. `?callbackUrl=/\evil.com` → tras login debe caer en `/dashboard`, nunca en `evil.com`.
2. `?callbackUrl=%2f%2fevil.com` y `?callbackUrl=/\evil.com%2f..` → mismo resultado.
3. `?callbackUrl=/dashboard/../otro` → redirige a ruta interna válida (o `/dashboard`), sin salir del origen.

**Solución propuesta:**

```ts
import { headers } from "next/headers";

/** Sólo rutas internas del mismo origen: defensa contra open-redirects. */
async function safeCallback(raw: FormDataEntryValue | null): Promise<string> {
  const fallback = "/dashboard";
  const value = typeof raw === "string" ? raw : "";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const origin = (await headers()).get("origin") ?? "http://localhost:3000";
    const url = new URL(value, origin);          // normaliza %5c, .., etc.
    return url.origin === origin ? url.pathname + url.search : fallback;
  } catch {
    return fallback;
  }
}
// start(): await signIn(provider, { redirectTo: await safeCallback(formData.get("callbackUrl")) });
```

---

### [CRÍTICO · Seguridad/Autorización] `auth.ts:23` + `app/dashboard/audit/page.tsx:6-8` — Rol hardcodeado y panel destructivo sin gate

`token.role = token.role ?? "Operador"` asigna el mismo rol a todo el mundo y **ninguna página verifica roles**: `/dashboard/audit` expone `POST /api/test/reset-data` (borra todas las órdenes) a cualquier sesión autenticada. La única defensa real es el backend, que además no recibe cabeceras de rol.

**Vectores de prueba:**

1. Sesión con `role: "Operador"` accede a `/dashboard/audit` → debe recibir `redirect("/dashboard")` (o 403) hasta que exista rol `Admin`.
2. `jwt` callback con `role` manipulado/ausente → el `session()` callback nunca emite un rol que no venga del servidor.
3. Llamada directa a `POST /api/test/reset-data` con cookie de sesión sin rol admin → 403 (E2E con route handler simulado).

**Solución propuesta:**

```ts
// lib/auth/guard.ts (server-only)
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireRole(...allowed: string[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!allowed.includes(session.user.role ?? "")) redirect("/dashboard");
  return session;
}
```

```tsx
// app/dashboard/audit/page.tsx
export default async function AuditPage() {
  await requireRole("Admin");   // gate server-side real, no cosmético
  return <AuditPanel />;
}
```

Y en `auth.ts`, eliminar el default `"Operador"`: obtener `role` del backend en el callback `jwt` (el TODO de la línea 22 ya lo reconoce) y negar sesión si no existe.

---

### [CRÍTICO · Seguridad client-side] `lib/api/config.ts:2` + `lib/api/mock/server.ts:29-75` — El mock es fuente de verdad manipulable y viaja al bundle

`NEXT_PUBLIC_USE_MOCKS` se inlina en el cliente: si un build de producción se genera con `true`, **cualquier usuario edita `localStorage` y "persiste" órdenes falsas**, y el backend real queda fuera. No hay guardia de build.

(Hallazgo positivo verificado: no hay `dangerouslySetInnerHTML`, `eval`, tokens ni API keys expuestas fuera de `NEXT_PUBLIC_API_URL`.)

**Vectores de prueba:**

1. Build con `NEXT_PUBLIC_USE_MOCKS=true` → `npm run build` debe fallar explícitamente en `NODE_ENV=production`.
2. En dev con mocks, editar la clave de storage en `localStorage` con JSON corrupto → la app debe degradar a datos seed, no crashear (hoy `JSON.parse` en línea 36).
3. `NEXT_PUBLIC_API_URL="javascript:alert(1)"` o con path relativo → debe ser rechazado al arrancar.

**Solución propuesta:**

```ts
// lib/api/config.ts
export const USE_MOCKS =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_USE_MOCKS === "true";

if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_USE_MOCKS === "true") {
  throw new Error("NEXT_PUBLIC_USE_MOCKS=true prohibido en producción");
}
```

```ts
// mock/server.ts — leer con validación
function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(window.localStorage.getItem(key) ?? "") as T; }
  catch { window.localStorage.removeItem(key); return fallback; }
}
```

---

### [ALTO · Rendimiento/Core Web Vitals] `components/ui/webcam-pixel-grid.tsx:268-273` — Canvas redimensionado en **cada frame** + `getUserMedia` sin gesto

Cada `requestAnimationFrame` reasigna `canvas.width/height` (realloc del backing-store + clear 60×/s), allocota `new Uint8ClampedArray(currentData)` (línea 262) e itera `getImageData`; y `hero-background.tsx:121` lo monta **pidiendo la cámara sin interacción del usuario** en la landing (fuga de batería, LED encendido, prompt invasivo que daña la percepción de carga).

**Vectores de prueba:**

1. Cargar la landing 30 s en DevTools Performance → no debe aparecer `ResizeCanvas` repetido por frame ni `getImageData` continuo tras estabilizarse el tamaño.
2. Simular `resize` de ventana → el canvas debe recortarse una sola vez por cambio (contar asignaciones a `canvas.width`).
3. Primer visitante sin interacción → no debe existir llamada a `getUserMedia` ni prompt de permisos (sólo tras clic en un control explícito).

**Solución propuesta:**

```tsx
// Sólo reasignar el backing-store cuando el tamaño realmente cambia
const sizeRef = useRef({ w: 0, h: 0, dpr: 0 });
useEffect(() => {
  const ro = new ResizeObserver(([entry]) => {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(entry.contentRect.width * dpr);
    const h = Math.round(entry.contentRect.height * dpr);
    if (w === sizeRef.current.w && h === sizeRef.current.h) return;
    sizeRef.current = { w, h, dpr };
    canvas.width = w; canvas.height = h;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // setTransform en vez de scale acumulativo
  });
  ro.observe(canvas);
  return () => ro.disconnect();
}, []);

// Buffer reutilizado
if (!frameRef.current || frameRef.current.length !== currentData.length) {
  frameRef.current = new Uint8ClampedArray(currentData.length);
}
frameRef.current.set(currentData);

// hero-background.tsx: pedir cámara sólo tras gesto
const [armed, setArmed] = useState(false);
// ... botón "Activar fondo con cámara" → setArmed(true) → montar <WebcamPixelGrid/>
```

---

### [ALTO · Rendimiento] `components/ui/background-beams.tsx:96-113` — 59 gradientes animados con `repeat: Infinity` y `Math.random()` en render (login)

Cada `motion.linearGradient` corre su propio timer de framer-motion en el hilo principal (59 animaciones + paints continuos justo en `/login`), y `Math.random()` en render (líneas 107, 110, 113) **regenera duraciones/delays en cada re-render** del padre (`LoginPanel` re-renderiza al mostrar toasts de error).

**Vectores de prueba:**

1. Abrir `/login`, provocar un re-render (toast de error) → el `path[0]` no debe cambiar `transition.duration` (hoy sí cambia; snapshot del DOM).
2. Performance monitor en `/login` 15 s → <5 animaciones JS simultáneas y sin frames >50 ms.
3. `prefers-reduced-motion: reduce` → no debe montarse el componente (hoy sólo se corta en `login-panel.tsx:93`; verificar que el guard cubra también re-montajes).

**Solución propuesta:**

```tsx
const GRADIENTS = Array.from({ length: 10 }, (_, i) => ({   // 10, no 59
  id: `g-${i}`,
  y2: `${93 + ((i * 37) % 8)}%`,                             // determinista, sin Math.random en render
  duration: 12 + ((i * 7) % 10),
  delay: (i * 1.7) % 10,
}));

export function BackgroundBeams({ className }: Props) {
  const paths = useMemo(() => GRADIENTS, []);
  // ... maps sobre paths
}
```

O mejor: animar `x1/x2` con una sola animación CSS `@keyframes` en `globals.css` (corre en el compositor, costo ~0 en JS).

---

### [ALTO · Rendimiento] `components/ui/moving-border.tsx:88-94` — `getTotalLength()` en **todos** los frames (forced reflow continuo)

`useAnimationFrame` consulta geometría SVG cada frame sin importar visibilidad; hay 2 instancias simultáneas (`login-panel.tsx:56`, landing `final-cta`/`audit-section`) = 2 bucles rAF + 2 reflows por frame durante toda la sesión. También es el botón de submit de login (CPU en dispositivo móvil).

**Vectores de prueba:**

1. Llevar el botón fuera del viewport (scroll) → el rAF debe pausar (contar llamadas a `progress.set` con spy).
2. Cachear `length`: tras montar, `getTotalLength` debe llamarse ≤1 vez (o 1 por resize), no 60/s.
3. Login en throttling CPU 6× → el input de foco no debe sufrir long tasks >50 ms atribuibles a la animación.

**Solución propuesta:**

```tsx
const lengthRef = useRef(0);
useEffect(() => {
  const measure = () => { lengthRef.current = pathRef.current?.getTotalLength() ?? 0; };
  measure();
  const ro = new ResizeObserver(measure);
  if (pathRef.current) ro.observe(pathRef.current);
  return () => ro.disconnect();
}, []);

const inView = useInView(containerRef, { margin: "100px" });
useAnimationFrame((time) => {
  const length = lengthRef.current;
  if (!inView || !length) return;                 // pausa fuera de pantalla
  progress.set((time * (length / duration)) % length);
});
```

---

### [ALTO · Estado/DOM] `components/ui/infinite-moving-cards.tsx:29-49` — `cloneNode` sin cleanup = duplicación de nodos

El `useEffect([])` appendea clones al `<ul>` imperativamente. Con React 19 StrictMode (dev) o cualquier remount la lista se duplica ×4; si `items` cambia quedan clones huérfanos con datos viejos que React no reconcilia (nodos duplicados que los screen readers leen dos veces).

**Vectores de prueba:**

1. Montar → desmontar → montar el componente → `ul.children.length` debe ser `2 * items.length`, no `4 * items.length`.
2. Cambiar la prop `items` → el DOM no debe conservar nodos con el texto antiguo.
3. E2E: el estado `aria-hidden` sólo debe cubrir la copia duplicada.

**Solución propuesta:**

```tsx
// Declarativo, sin tocar el DOM a mano
const doubled = useMemo(() => [...items, ...items], [items]);
return (
  <ul ref={scrollerRef} className="flex w-max">
    {doubled.map((item, i) => (
      <li key={`${i}-${item.id ?? ""}`} aria-hidden={i >= items.length}>
        {renderItem(item)}
      </li>
    ))}
  </ul>
);
// + useEffect de la animación con cleanup: cancelAnimationFrame en return
```

---

### [MEDIO · Estado] `components/kanban/kanban-board.tsx:161` y `:326` — `setTimeout` sin cleanup → `setState` tras desmonte

`shake()` y el highlight de creación programan timers que **nunca se cancelan**: al navegar fuera del kanban se ejecuta `setShakingId`/`setHighlightId` sobre componente desmontado (warning de React + fuga de la referencia). También hay timers "fantasma" que reviven estados si el usuario vuelve rápido.

**Vectores de prueba:**

1. Disparar `shake` y navegar a `/dashboard` antes de 650 ms → sin warning `Can't perform a React state update on an unmounted component` (spy de `console.error` en el test).
2. Crear orden y salir antes de 2200 ms → mismo resultado.
3. Crear orden y recargar kanban en <2200 ms → la tarjeta NO debe perder el highlight por timers cruzados de montajes distintos.

**Solución propuesta:**

```tsx
const timersRef = useRef<number[]>([]);

const schedule = (fn: () => void, ms: number) => {
  const id = window.setTimeout(fn, ms);
  timersRef.current.push(id);
};

useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

const shake = (id: string) => {
  setShakingId(id);
  schedule(() => setShakingId((s) => (s === id ? null : s)), 650);
};
// y en createOrder: schedule(() => setHighlightId(null), 2200)
```

Ídem en `json-viewer.tsx:43` (`setTimeout` del clipboard).

---

### [MEDIO · Accesibilidad] `hero-background.tsx:95` + `webcam-pixel-grid.tsx:434, 503` — botones focusables dentro de `aria-hidden`

El popup de error de cámara y su botón minimizado son `<button>` reales **dentro de un subtree `aria-hidden="true"`**, sin `aria-label` en el botón X: violación `aria-hidden-focus` (axe) — el teclado enfoca controles invisibles para AT y el mensaje "Camera access needed" jamás se announce.

**Vectores de prueba:**

1. `axe.run()` sobre la landing con la webcam en error → 0 violaciones `aria-hidden-focus`.
2. Tab hasta el popup → el foco no debe entrar a elementos bajo `aria-hidden`; si el popup está visible, debe ser anunciable.
3. `getByRole("button", { name: /cerrar/i })` en el popup → debe existir (hoy no hay nombre accesible).

**Solución propuesta:**

```tsx
// Sacar los popups del subtree decorativo
{error && showErrorPopup && createPortal(
  <div role="alertdialog" aria-label="Error de cámara" className="fixed top-4 right-4 z-[60] ...">
    <button type="button" aria-label="Cerrar aviso de cámara" onClick={...}>…</button>
  </div>, document.body
)}
// botón minimizado:
<button type="button" aria-label="Reintentar acceso a la cámara" title="Camera access required">
```

**Relacionado (contraste):** `final-cta.tsx:86` (`text-white/35` ≈ 3:1 sobre #030303), `tech-marquee.tsx:19`, `floating-orders.tsx:66`, `hero.tsx:93` → subir a `text-white/70` mínimo (AA 4.5:1 para <18px).

---

### [MEDIO · Hidratación] `components/landing/final-cta.tsx:86` — `new Date().getFullYear()` en render client+server

Si el render del server cae en UTC el 31/dic y el cliente en es-MX ya es enero (o al revés), el HTML difiere → mismatch de hidratación anual en React 19.

**Vectores de prueba:**

1. Renderizar el componente con `Date` mockeada al 31/dic 23:59 UTC → server y client deben producir el mismo string (o usar el guard).
2. `hydrateRoot` sin warnings de hidratación en consola (E2E con spy de `console.error`).
3. Año fijo vía prop/build → el snapshot no cambia entre zonas horarias.

**Solución propuesta:**

```tsx
// Footer es Server Component: calcular allí y pasar por props
const year = new Date().getFullYear();
<Footer year={year} />
// o inmediato y seguro:
<p suppressHydrationWarning>© {new Date().getFullYear()} OmniMarket · MXN · es-MX</p>
```

---

### [MEDIO · Estado/Concurrencia] `lib/hooks/use-api.ts:11-18` — sin `AbortSignal` ni guard anti-carrera

`useAnalyticsSeries` dispara `limit: 500` sin cancelar la petición anterior: al cambiar filtros rápidamente, dos respuestas vuelven en orden indeterminado y **la más vieja puede pintarse al final** (SWR mitiga por key, pero el fetch viejo sigue corriendo y, con latencia real, puede resolver después). Además `api.getAnalytics` usa `paginationSchema.parse` (línea 73) que lanza `ZodError` crudo al UI.

**Vectores de prueba:**

1. Cambiar `from` dos veces con latencias invertidas (mock con delay 100 ms / 10 ms) → el gráfico debe mostrar siempre los filtros últimos.
2. Desmontar el componente con una petición en vuelo → no debe haber `setState` posterior ni error `AbortError` visible en UI.
3. `page: 0` llegando a `api.getAnalytics` → error controlado con toast, no excepción sin capturar.

**Solución propuesta:**

```ts
export function useAnalyticsSeries(filters: AnalyticsFilters = {}) {
  const key = ["analytics-series", filters.from ?? "", filters.to ?? "", filters.categoryId ?? ""];
  return useSWR(key, ({ signal }) =>
    api.getAnalytics({ page: 1, limit: 500, ...filters }, signal).then((r) => r.data.data),
  ); // SWR aborta la petición anterior al cambiar de key
}
// schemas: usar safeParse en la frontera UI y mapear a ApiError/tooltip
```

---

## 2. Cobertura de pruebas

**Hoy:**

- **Unit (Vitest, entorno node, sólo `tests/unit`):** `schemas`, `kanban`, `decimal`, `finance`, `analytics` (parcial), `format`.
- **E2E (Playwright, sólo Chromium, adaptador mock):** auth redirect/toast, kanban DnD persistente, rollback con 500, alta con validación Zod, bulk con confirmación, 409 por concurrencia entre pestañas.
- **Sin tests:** `lib/api/client.ts`, `lib/api/transport.ts`, `middleware.ts`/roles, `app/login/actions.ts` (open-redirect), timers/limpieza de componentes, `components/audit/*`, `components/dashboard/analytics-view.tsx`.

**Edge cases prioritarios a añadir (unit):**

1. `client.ts` — 200 con body fuera de contrato → `ApiError("…contrato esperado")`; no-2xx sin `{error}` → fallback `HTTP 422`; `isConflict` sólo en 409.
2. `transport.ts` — body HTML de proxy 502 → `{error: text.slice(0,300)}`; `buildUrl` serializa `0` y descarta `""`/`undefined`.
3. `login/actions.ts` — tabla de open-redirects (`//x`, `/\x`, `javascript:`, `https://evil.com`) → todos a `/dashboard`.
4. `lib/kanban.ts` — `moveCard` con `toIndex` negativo/out-of-bounds, id inexistente → estado sin mutar.
5. `analyticsFiltersSchema` — `from > to` rechazado; `categoryId: ""` rechazado.
6. `analytics-view.tsx` — `?limit=37` → 25; `page=0` → 1; `totalPages === 0` con datos vacíos.
7. Mock bulk — id inexistente → 404 **atómico** (ninguna tarjeta cambia); id repetido en `ids`.

**E2E/Playwright a añadir:**

1. Kanban: soltar en **columna vacía**, soltar **fuera del tablero** (rollback al snapshot) y `Escape` durante el arrastre.
2. Diálogo de creación: doble submit (Enter + clic) crea **una** orden; cerrar el diálogo durante el envío no lo cierra.
3. `/dashboard/audit`: `limit=1000` → toast de validación + `aria-invalid`; reset con HTTP 500 → sin toast de éxito y sin invalidar cachés SWR.
4. Auditoría a11y global: `axe` sobre `/`, `/login`, `/dashboard/kanban` en CI (fallar el pipeline con `aria-hidden-focus` y contraste).

---

## 3. Hallazgos adicionales (baja severidad / backlog)

| Archivo:Línea | Hallazgo | Fix sugerido |
|---|---|---|
| `app/page.tsx:13-23` | 8 secciones client importadas estáticamente → JS de `motion`/tooltips en el bundle inicial | `next/dynamic` + `IntersectionObserver` para secciones below-the-fold |
| `components/landing/dashboard-mockup.tsx:17` | Mockup con contenido "real" sin `aria-hidden` → AT anuncia datos ficticios | Envolver en `aria-hidden="true"` |
| `components/landing/bento.tsx:61,204,259` | `repeat: Infinity` sin `usePrefersReducedMotion` (el guard CSS no aplica a framer-motion) | Patrón ya usado en `feature-cards.tsx:109` |
| `components/ui/tracing-beam.tsx:28,73` | `svgHeight` medido 1 vez; `scrollYProgress.get()` en render congela el valor | `ResizeObserver` + `useMotionValueEvent`/`useTransform` |
| `components/landing/ambient-pixel-grid.tsx:48` | `pointermove` con `getBoundingClientRect()` sin agrupar en rAF | Guardar coords crudas y consumirlas en el loop rAF |
| `components/ui/webcam-pixel-grid.tsx:117-154` | Callbacks inline en deps → bucle de `getUserMedia`; reintento sin parar tracks previos | Callbacks en refs + `streamRef.current?.getTracks().forEach(t => t.stop())` |
| `components/dashboard/user-menu.tsx:23` | `<img>` sin `width`/`height` → CLS menor | Añadir dimensiones fijas (`size-8` ya lo mitiga parcialmente) |
| `components/kanban/kanban-board.tsx:62-93` | `MockFailureToggle` se codea en el bundle de producción (sólo visible con mocks) | Importar con `dynamic(() => import(...))` condicional a `USE_MOCKS` |
