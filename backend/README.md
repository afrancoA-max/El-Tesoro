# Backend — API de catálogo (Módulo 02)

API pública de solo lectura del catálogo (categorías, productos, búsqueda, colecciones) + importador de catálogo desde el Excel real del negocio. Ver `docs/plan/02-api-catalogo.md` para el alcance completo.

## Desarrollo local

1. Copiar `.env.example` a `.env` y apuntar `DATABASE_URL` a una base local (`infra/docker-compose.yml`) o a staging vía [Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy):
   ```bash
   cloud-sql-proxy --port=5433 project-26c70338-0265-4c7e-837:us-central1:proyectoalmaceneltesoro
   ```
2. `npm install` (desde la raíz del monorepo, es un workspace de npm).
3. `npm run prisma:migrate:deploy --workspace=backend`
4. `npm run dev --workspace=backend`

## Importador de catálogo

Vía oficial de carga de catálogo hasta que exista el panel admin (módulo 08) o el API real de productos del negocio (aún no existe). Lee el Excel real (`productos_almacen_el_tesoro_completo.xlsx` en la raíz del repo por defecto), sube fotos a Cloud Storage y crea/actualiza productos sin duplicar en corridas repetidas.

```bash
npm run import:catalogo --workspace=backend
# opciones:
npm run import:catalogo --workspace=backend -- --file=/ruta/otro.xlsx --bucket=otro-bucket --skip-images
```

Requiere credenciales de Google Cloud disponibles (`gcloud auth application-default login`) para escribir en el bucket de imágenes.

**Decisiones tomadas con el negocio (2026-08-28) sobre este archivo real:**
- Solo se importan filas con precio numérico real (71 de 1270 filas) — el resto queda rechazado con motivo "sin precio numérico real" hasta que el negocio tenga el dato. Volver a correr el importador cuando haya más precios reales en el archivo.
- El mapeo de las categorías del Excel (por tipo de producto) a las categorías aprobadas en la base de datos (por material, ver `backend/prisma/seed.ts`) es una **propuesta** de Claude Code en `backend/scripts/categoryMapping.ts` — pendiente de revisión por el dueño del negocio, en especial la categoría "VAJILLAS" que mezcla baterías de cocina y vajillas de mesa.
- Las fotos se descargan de las URLs del Excel y se re-alojan en Cloud Storage (`gs://eltesoro-product-images-staging`); las filas con el texto "Sin imagen disponible" en vez de una URL real quedan importadas sin foto (advertencia, no rechazo).

Filas rechazadas y advertencias quedan en `backend/scripts/import-rechazadas.json` / `import-advertencias.json` (no se commitean, ver `.gitignore` — regenerarlos corriendo el importador).

## Infraestructura GCP (staging)

| Recurso | Nombre |
|---|---|
| Proyecto | `project-26c70338-0265-4c7e-837` |
| Cloud SQL (PostgreSQL) | `proyectoalmaceneltesoro` (instancia de prueba gratuita de Enterprise Plus — revisar fecha de expiración del trial antes del Módulo 09) |
| Base de datos de staging | `eltesoro_staging` |
| Bucket de imágenes | `gs://eltesoro-product-images-staging` (lectura pública) |
| Artifact Registry | `eltesoro-backend` (us-central1) |
| Cloud Run (staging) | `eltesoro-backend-staging` |
| Cuenta de servicio de despliegue | `eltesoro-deployer@project-26c70338-0265-4c7e-837.iam.gserviceaccount.com` |

El despliegue a staging es automático: un push a `main` que toque `backend/`, `shared/` o el propio workflow dispara `.github/workflows/deploy-staging.yml`, que aplica migraciones de Prisma contra Cloud SQL y despliega a Cloud Run vía Workload Identity Federation (sin llaves JSON — bloqueadas por política de organización del proyecto).
