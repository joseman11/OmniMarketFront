# Despliegue del frontend (Vercel desde GitHub Actions)

Producción se despliega **solo** desde `.github/workflows/ci.yml`, y solo si pasan los checks:

```
push a main → quality (lint · typecheck · unit · build)
            → e2e (Playwright), cypress y published-api, tras quality; Frontend CI Gate exige los cuatro
            → deploy (vercel pull → build --prod → deploy --prebuilt --prod), tras quality y e2e
            → smoke, tras deploy
```

- `deploy` corre únicamente en `push` a `main` y necesita `quality` y `e2e`; en pull requests y en `dev` no se ejecuta. `cypress` y `published-api` siguen corriendo y forman parte de `Frontend CI Gate`, pero no condicionan el despliegue: `published-api` mide el backend ya publicado, y si condicionara el deploy, un backend caído impediría desplegar el arreglo del frontend.
- `smoke` llama, en el dominio público del frontend, a `/api/test/analytics?page=1&limit=50` y `/api/test/kanban-status?orderNumber=OM-TEST-1001`, y falla si alguna no responde 200. `next.config.ts` reenvía `/api/test/*` al backend, así que el smoke comprueba el deploy del frontend, su proxy y los endpoints de auditoría.
- En `main` la CI no cancela una ejecución en curso al llegar otro push, y los despliegues de producción se encolan (`concurrency`), así que nunca se corta uno a medias.

Nada de lo de abajo está aplicado: son ajustes en GitHub y en Vercel que hay que hacer a mano una vez.

## 1. Secretos y variable en GitHub

Repositorio del frontend → **Settings → Secrets and variables → Actions**.

| Tipo | Nombre | Valor |
| --- | --- | --- |
| Secret | `VERCEL_TOKEN` | Token creado en <https://vercel.com/account/tokens> con alcance al equipo dueño del proyecto |
| Secret | `VERCEL_ORG_ID` | ID del equipo/cuenta (`orgId`) |
| Secret | `VERCEL_PROJECT_ID` | ID del proyecto **del frontend** (`projectId`) |
| Variable | `PRODUCTION_URL` | Dominio público estable del frontend, p. ej. `https://<proyecto>.vercel.app` (sin barra final) |

Antes de llamar la CLI, el workflow comprueba que `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID` estén definidos. Si falta uno, el job muestra cuál secreto debe configurarse y detiene el despliegue.

`orgId` y `projectId` se obtienen ejecutando `vercel link` en este repositorio (crea `.vercel/project.json`, que está fuera de git) o en Vercel: **Project → Settings → General → Project ID** y **Team → Settings → General → Team ID**.

Sin `PRODUCTION_URL`, el smoke usa la URL única del deployment; si **Deployment Protection** está activa, esa URL responde 401 y el smoke falla.

`vercel build` usa las variables de entorno de producción del proyecto en Vercel (`OMNIMARKET_API_URL`, `NEXT_PUBLIC_USE_MOCKS=false`…); no hace falta duplicarlas en GitHub.

## 2. Desactivar el despliegue automático de producción desde Git (Vercel)

Mientras la integración de Git de Vercel siga desplegando `main`, un commit roto llega a producción aunque la CI falle. Elige **una** opción:

- **Ignored Build Step** (recomendada): Project → **Settings → Git → Ignored Build Step** → *Custom* con

  ```sh
  [ "$VERCEL_ENV" = "production" ]
  ```

  El comando sale con 0 en builds de producción disparados por Git (Vercel los omite) y con 1 en previews (se construyen). No afecta a `vercel deploy --prebuilt` de la CI, que no ejecuta un build en Vercel.
- **Sin Git para `main`**: crear `vercel.json` con `{ "git": { "deploymentEnabled": { "main": false } } }`. Es un cambio del repositorio, no aplicado aquí.

## 3. Proteger `main` con checks obligatorios (GitHub)

Repositorio → **Settings → Branches → Add branch protection rule** (o **Rules → Rulesets**) para `main`:

- *Require a pull request before merging*.
- *Require status checks to pass before merging* → *Require branches to be up to date*, con los checks:
  - `Frontend CI Gate` (pasa solo si pasaron `Lint · Typecheck · Unit · Build`, `E2E (Playwright)`, `E2E (Cypress)` y `E2E (API publicado)`; basta con exigir este)
- *Do not allow bypassing the above settings* (incluye administradores).

Los checks aparecen en el buscador después de una primera ejecución del workflow con estos nombres. No marques `deploy` ni `smoke` como obligatorios: en pull requests se omiten.

Si ya configuraste `Frontend CI Gate` en Vercel (**Settings → Deployment Checks → GitHub Checks**), puede quedarse.

## 4. Orden con el backend

El smoke depende del backend desplegado y de sus fixtures de auditoría (`OM-TEST-1001`, creados con `POST /api/test/reset-data`). Si un cambio toca el contrato, desplegar primero el backend.
