# Despliegue del frontend (Vercel desde GitHub Actions)

Producción se despliega **solo** desde `.github/workflows/ci.yml`, y solo si pasan los checks:

```
push a main → quality (lint · typecheck · unit · build)
            → e2e (Playwright), cypress y published-api, tras quality; Frontend CI Gate exige los cuatro
            → deploy (vercel pull → build --prod → deploy --prebuilt --prod), solo tras Frontend CI Gate
            → smoke, tras deploy
```

- `deploy` corre únicamente en `push` a `main` y necesita `ci-gate`. Si falla cualquiera de `quality`, `e2e`, `cypress` o `published-api`, `Frontend CI Gate` falla y `deploy` queda omitido. En pull requests y en `dev`, el deploy de producción no se ejecuta.
- `smoke` llama, en el dominio público del frontend, a `/api/test/analytics?page=1&limit=50` y `/api/test/kanban-status?orderNumber=OM-TEST-1001`, y falla si alguna no responde 200. `next.config.ts` reenvía `/api/test/*` al backend, así que el smoke comprueba el deploy del frontend, su proxy y los endpoints de auditoría.
- En `main` la CI no cancela una ejecución en curso al llegar otro push, y los despliegues de producción se encolan (`concurrency`), así que nunca se corta uno a medias.

El workflow y `vercel.json` hacen que la Action sea la única ruta de despliegue de producción desde `main`. La protección para impedir merges con CI roja sí requiere una regla en GitHub.

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

`PRODUCTION_URL` es obligatoria para el smoke y debe ser el dominio público estable asignado al proyecto en Vercel (Project → Settings → Domains), no la URL única del deployment. Sin la variable, el smoke falla con un mensaje claro en vez de probar una URL posiblemente protegida. Con **Standard Protection**, las URLs únicas de deployment pueden requerir autenticación mientras el dominio de producción sigue público; si el dominio estable también redirige, revisa si el proyecto está en **All Deployments** o si la aplicación genera la redirección.

`vercel build` usa las variables de entorno de producción del proyecto en Vercel (`OMNIMARKET_API_URL`, `NEXT_PUBLIC_USE_MOCKS=false`…); no hace falta duplicarlas en GitHub.

## 2. Despliegue automático desde Git (Vercel)

`vercel.json` contiene `git.deploymentEnabled.main=false`, que desactiva los despliegues automáticos disparados por commits de `main`. La Action sigue desplegando con `vercel deploy --prebuilt --prod` después de pasar el gate. Esta configuración se aplica cuando Vercel procese la nueva versión del proyecto.

Confirma que el cambio aparece en el proyecto de Vercel y que no haya otro proyecto conectado al mismo repositorio con auto deploy de producción habilitado. También puede desactivarse desde Project → **Settings → Git**.

## 3. Proteger `main` con checks obligatorios (GitHub)

Repositorio → **Settings → Branches → Add branch protection rule** (o **Rules → Rulesets**) para `main`:

- *Require a pull request before merging*.
- *Require status checks to pass before merging* → *Require branches to be up to date*, con los checks:
  - `Frontend CI Gate` (pasa solo si pasaron `Lint · Typecheck · Unit · Build`, `E2E (Playwright)`, `E2E (Cypress)` y `E2E (API publicado)`; basta con exigir este)
- Restringe los pushes directos a `main` y activa *Do not allow bypassing the above settings* para que nadie pueda saltarse la regla.

Los checks aparecen en el buscador después de una primera ejecución del workflow con estos nombres. No marques `deploy` ni `smoke` como obligatorios: en pull requests se omiten.

Si ya configuraste `Frontend CI Gate` en Vercel (**Settings → Deployment Checks → GitHub Checks**), puede quedarse.

## 4. Orden con el backend

El smoke depende del backend desplegado y de sus fixtures de auditoría (`OM-TEST-1001`, creados con `POST /api/test/reset-data`). Si un cambio toca el contrato, desplegar primero el backend.
