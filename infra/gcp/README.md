# Infraestructura de GCP — El Tesoro

Scripts idempotentes para crear (o recrear) el entorno de staging/producción
en Google Cloud, parametrizados por `ENV` (`stg` o `prd`). Nacieron de la
migración de staging del 2026-09-26 (ver `docs/revision/migracion-gcp-staging.md`)
y están pensados para repetirse igual en el Módulo 09 con `ENV=prd`.

**Ninguno de estos scripts borra nada.** Son solo para crear/actualizar.
La limpieza de un proyecto viejo se hace a mano, con confirmación en cada
paso (ver la sección "Limpieza" al final de `migracion-gcp-staging.md`).

## Requisitos

- `gcloud` instalado, con tu cuenta autenticada (`gcloud auth login`) y con
  Application Default Credentials (`gcloud auth application-default login`).
- **Windows:** si `gcloud` falla con "Python was not found", exporta el
  Python embebido del propio Cloud SDK antes de correr cualquier script:
  ```bash
  export CLOUDSDK_PYTHON="/c/Users/<tu-usuario>/AppData/Local/Google/Cloud SDK/google-cloud-sdk/platform/bundledpython/python.exe"
  ```
- El ID de tu cuenta de facturación (`gcloud billing accounts list`).
- Node/npm instalados si vas a usar `06-migrar-datos.sh` (corre
  `prisma migrate status` para verificar) o `07-desplegar-manual.sh`.
- Docker **no** es necesario — todo se construye con Cloud Build
  (`gcloud builds submit`), útil si tu máquina no tiene Docker (como la que
  se usó en esta migración).

## Orden de ejecución (entorno nuevo desde cero)

Todas las variables se pasan como variables de entorno antes del comando.
`ENV` y `BILLING_ACCOUNT` son obligatorias en casi todos los scripts.

```bash
export ENV=stg                                  # o prd
export BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX      # gcloud billing accounts list

# Fase 1 — proyecto, facturación, presupuesto, APIs
./infra/gcp/01-proyecto.sh

# Fase 1 (cont.) — cuentas de servicio + Workload Identity Federation
./infra/gcp/02-cuentas-servicio-wif.sh
#   ^ imprime al final los valores que necesitas pegar en
#     .github/workflows/deploy-staging*.yml (WORKLOAD_IDENTITY_PROVIDER,
#     DEPLOYER_SA, RUNTIME_SA) — actualízalos a mano, son texto plano, no
#     secretos.

# Fase 2 — Cloud SQL (instancia, base, usuario de la app, DATABASE_URL)
./infra/gcp/03-cloudsql.sh

# Fase 4 — secretos de la app (JWT, proxy interno, Brevo)
./infra/gcp/04-secretos.sh
# Para copiar la API key de Brevo desde otro proyecto en vez de pegarla:
#   COPY_BREVO_FROM_PROJECT=diginet-eltesoro-stg ./infra/gcp/04-secretos.sh

# Fase 1 (cont.) — Artifact Registry + bucket de imágenes
./infra/gcp/05-artifact-registry-storage.sh

# (Opcional, si vienes de un proyecto/instancia viejo con datos reales)
# Fase 0 + Fase 3 — respaldo, import, copia de imágenes
SOURCE_PROJECT=project-viejo SOURCE_INSTANCE=instancia-vieja \
SOURCE_DB=basededatos_vieja SOURCE_BUCKET=bucket-viejo \
  ./infra/gcp/06-migrar-datos.sh

# Primer despliegue (antes de que el CI/CD esté actualizado y probado)
./infra/gcp/07-desplegar-manual.sh
```

Después del primer despliegue manual, actualiza
`.github/workflows/deploy-staging.yml` y `deploy-staging-frontend.yml` con
los nombres/URLs del `ENV` nuevo (proyecto, servicios, `SQL_CONNECTION_NAME`,
`WORKLOAD_IDENTITY_PROVIDER`) y haz push a `main` — el pipeline real se
encarga de ahí en adelante.

## Notas importantes (cosas que salieron mal la primera vez)

- **`eltesoro-deployer` necesita `roles/cloudsql.client`**, no solo
  `eltesoro-runtime`. Sin esto, el paso "Iniciar Cloud SQL Auth Proxy" del
  workflow *parece* pasar (el socket local se crea igual), pero
  `prisma migrate deploy` falla al conectar de verdad. `02-cuentas-servicio-wif.sh`
  ya lo incluye.
- **`.dockerignore` no debe excluir `frontend/`** — rompe cualquier build
  Docker del frontend (bug real encontrado y corregido el 2026-09-26, no
  es específico de esta migración).
- **`PRODUCT_IMAGES_BUCKET` debe pasarse como build ARG del Dockerfile del
  frontend**, no solo como variable de entorno de Cloud Run — Next.js
  congela `images.remotePatterns` en el build `standalone`, no lo relee al
  arrancar el servidor. `07-desplegar-manual.sh` y los workflows de GitHub
  Actions ya lo hacen bien.
- **Cuentas de facturación personales tienen un límite de 5 proyectos
  vinculados.** Si `01-proyecto.sh` falla con "Cloud billing quota
  exceeded", revisa `gcloud billing projects list --billing-account=...` y
  desvincula uno que no uses, o pide un aumento de cuota.
- **El import de `gcloud sql import sql` deja las tablas con dueño
  `cloudsqlsuperuser`**, no el usuario de la app — hay que reasignar la
  propiedad a mano después (ver las instrucciones que imprime
  `06-migrar-datos.sh`).
- **`gcloud sql instances create/patch` en algunas versiones del SDK no
  soporta `--labels`** — si tu versión sí lo soporta, agrégalo a mano en
  `03-cloudsql.sh`.

## Diferencias entre `stg` y `prd`

| | `stg` (por defecto) | `prd` (por defecto, override con env vars) |
|---|---|---|
| `SQL_TIER` | `db-f1-micro` | `db-g1-small` |
| `SQL_AVAILABILITY` | `ZONAL` (sin HA) | `REGIONAL` (con HA) |
| PITR | no | sí (activado automáticamente por `03-cloudsql.sh`) |
| `min-instances` | 0 en ambos servicios | sube el frontend a 1 a mano al desplegar |
| `BUDGET_AMOUNT` | \$25/mes | \$100/mes (ajusta según tráfico real) |
| Dominio | `*.run.app` | dominio propio (fuera del alcance de estos scripts) |

## Inventario de lo que crean estos scripts

| Recurso | Script | Nombre (ENV=stg) |
|---|---|---|
| Proyecto | `01-proyecto.sh` | `diginet-eltesoro-stg` |
| Presupuesto | `01-proyecto.sh` | "El Tesoro Staging" |
| Cuenta de servicio deployer | `02-cuentas-servicio-wif.sh` | `eltesoro-deployer@...` |
| Cuenta de servicio runtime | `02-cuentas-servicio-wif.sh` | `eltesoro-runtime@...` |
| Workload Identity Pool/Provider | `02-cuentas-servicio-wif.sh` | `github-actions-pool` / `github-actions-provider` |
| Cloud SQL | `03-cloudsql.sh` | `eltesoro-db-stg` |
| Base de datos | `03-cloudsql.sh` | `eltesoro_staging` |
| Usuario de la app | `03-cloudsql.sh` | `eltesoro_app` |
| Secreto DATABASE_URL | `03-cloudsql.sh` | `eltesoro-stg-database-url` |
| Secretos JWT / proxy interno / Brevo | `04-secretos.sh` | `eltesoro-stg-jwt-access-secret`, etc. |
| Artifact Registry | `05-artifact-registry-storage.sh` | `eltesoro` (Docker) |
| Bucket de imágenes | `05-artifact-registry-storage.sh` | `diginet-eltesoro-stg-media` |
| Cloud Run backend | `07-desplegar-manual.sh` | `eltesoro-api-stg` |
| Cloud Run frontend | `07-desplegar-manual.sh` | `eltesoro-web-stg` |
