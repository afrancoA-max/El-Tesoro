#!/usr/bin/env bash
# Fase 1 (cont.) — Cuentas de servicio + Workload Identity Federation.
#
# Dos cuentas de servicio:
#   - eltesoro-deployer: la usa GitHub Actions para desplegar (Cloud Run,
#     Artifact Registry, correr migraciones). No corre la app.
#   - eltesoro-runtime: la usan los propios servicios de Cloud Run en
#     ejecución (Cloud SQL Client, Secret Accessor solo de sus secretos).
#     Si la app se compromete, no hereda permisos de despliegue.
#
# Workload Identity Federation: GitHub Actions se autentica sin llaves JSON,
# restringido al repo GITHUB_REPO (variable en 00-lib.sh).
#
# Uso: ENV=stg BILLING_ACCOUNT=... ./infra/gcp/02-cuentas-servicio-wif.sh

cd "$(dirname "${BASH_SOURCE[0]}")"
source ./00-lib.sh
print_config

log "Creando cuentas de servicio..."
if resource_exists gcloud iam service-accounts describe "$DEPLOYER_SA" --project="$PROJECT_ID"; then
  log "  $DEPLOYER_SA ya existe."
else
  gcloud iam service-accounts create "$DEPLOYER_SA_NAME" \
    --project="$PROJECT_ID" --display-name="El Tesoro - CI/CD deployer"
fi

if resource_exists gcloud iam service-accounts describe "$RUNTIME_SA" --project="$PROJECT_ID"; then
  log "  $RUNTIME_SA ya existe."
else
  gcloud iam service-accounts create "$RUNTIME_SA_NAME" \
    --project="$PROJECT_ID" --display-name="El Tesoro - runtime (Cloud Run)"
fi

log "Workload Identity Federation..."
if resource_exists gcloud iam workload-identity-pools describe "$WIF_POOL" --project="$PROJECT_ID" --location=global; then
  log "  Pool $WIF_POOL ya existe."
else
  gcloud iam workload-identity-pools create "$WIF_POOL" \
    --project="$PROJECT_ID" --location=global --display-name="GitHub Actions"
fi

if resource_exists gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" \
    --project="$PROJECT_ID" --location=global --workload-identity-pool="$WIF_POOL"; then
  log "  Provider $WIF_PROVIDER ya existe."
else
  gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER" \
    --project="$PROJECT_ID" --location=global \
    --workload-identity-pool="$WIF_POOL" \
    --display-name="GitHub" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='${GITHUB_REPO}'" \
    --issuer-uri="https://token.actions.githubusercontent.com"
fi

PROJECT_NUM="$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")"
WIF_PROVIDER_RESOURCE="projects/${PROJECT_NUM}/locations/global/workloadIdentityPools/${WIF_POOL}/providers/${WIF_PROVIDER}"

log "Permitiendo que GitHub Actions (repo $GITHUB_REPO) asuma $DEPLOYER_SA..."
gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_SA" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUM}/locations/global/workloadIdentityPools/${WIF_POOL}/attribute.repository/${GITHUB_REPO}" \
  --condition=None

log "Permisos del deployer (despliega, no lee secretos de runtime)..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOYER_SA" --role="roles/run.admin" --condition=None >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOYER_SA" --role="roles/artifactregistry.writer" --condition=None >/dev/null
# El deployer necesita poder conectar el Cloud SQL Auth Proxy para correr
# `prisma migrate deploy` antes de construir la imagen — SIN este rol, el
# proxy arranca (el socket local se crea igual) pero la conexión real falla
# y el paso de migraciones truena. (Encontrado en la migración a stg del
# 2026-09-26: el primer deploy automático falló por esto.)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOYER_SA" --role="roles/cloudsql.client" --condition=None >/dev/null
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --project="$PROJECT_ID" \
  --member="serviceAccount:$DEPLOYER_SA" \
  --role="roles/iam.serviceAccountUser" --condition=None >/dev/null

log "Permisos del runtime (solo lo que la app necesita en ejecución)..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$RUNTIME_SA" --role="roles/cloudsql.client" --condition=None >/dev/null

log "Fase 1 (WIF) lista. Sigue con: ENV=$ENV ./infra/gcp/03-cloudsql.sh"
log "Anota esto para los workflows de GitHub Actions:"
log "  WORKLOAD_IDENTITY_PROVIDER = $WIF_PROVIDER_RESOURCE"
log "  DEPLOYER_SA                = $DEPLOYER_SA"
log "  RUNTIME_SA                 = $RUNTIME_SA"
