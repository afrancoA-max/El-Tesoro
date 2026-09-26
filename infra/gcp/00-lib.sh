#!/usr/bin/env bash
# Funciones y variables compartidas por los scripts de infra/gcp/*.
# Se cargan con `source infra/gcp/00-lib.sh`, nunca se ejecutan solas.
#
# Uso general: ENV=stg ./infra/gcp/01-proyecto.sh
# (ENV=prd para producción, Módulo 09 — mismos scripts, otros valores).

set -euo pipefail

# --- Variables obligatorias (sin valor por defecto a propósito) ---------
: "${ENV:?Define ENV=stg o ENV=prd, ej.: ENV=stg ./infra/gcp/01-proyecto.sh}"
: "${BILLING_ACCOUNT:?Define BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX (ID de tu cuenta de facturación)}"

if [[ "$ENV" != "stg" && "$ENV" != "prd" ]]; then
  echo "ENV debe ser 'stg' o 'prd' (recibido: '$ENV')" >&2
  exit 1
fi

# --- Nombres derivados (parametrizados por ENV) --------------------------
PROJECT_ID="${PROJECT_ID:-diginet-eltesoro-${ENV}}"
REGION="${REGION:-us-central1}"
GITHUB_REPO="${GITHUB_REPO:-afrancoA-max/El-Tesoro}"

SQL_INSTANCE="eltesoro-db-${ENV}"
SQL_DATABASE="eltesoro_${ENV_LONG:-$([ "$ENV" = stg ] && echo staging || echo production)}"
SQL_APP_USER="eltesoro_app"
# stg: instancia compartida sin SLA, barata. prd: con SLA — ver 03-cloudsql.sh.
SQL_TIER="${SQL_TIER:-$([ "$ENV" = stg ] && echo db-f1-micro || echo db-g1-small)}"
SQL_AVAILABILITY="${SQL_AVAILABILITY:-$([ "$ENV" = stg ] && echo ZONAL || echo REGIONAL)}"
SQL_DISK_GB="${SQL_DISK_GB:-10}"

BUCKET_MEDIA="diginet-eltesoro-${ENV}-media"
ARTIFACT_REPO="${ARTIFACT_REPO:-eltesoro}"

SERVICE_BACKEND="eltesoro-api-${ENV}"
SERVICE_FRONTEND="eltesoro-web-${ENV}"
DEPLOYER_SA_NAME="eltesoro-deployer"
RUNTIME_SA_NAME="eltesoro-runtime"
DEPLOYER_SA="${DEPLOYER_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_SA="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

WIF_POOL="github-actions-pool"
WIF_PROVIDER="github-actions-provider"

# stg: presupuesto chico de red de seguridad. prd: súbelo a mano según tráfico
# real esperado (BUDGET_AMOUNT=... antes de correr 01-proyecto.sh).
BUDGET_AMOUNT="${BUDGET_AMOUNT:-$([ "$ENV" = stg ] && echo 25 || echo 100)}"

LABELS="client=eltesoro,env=${ENV},owner=diginet"

# --- gcloud + Python embebido del SDK -------------------------------------
# En Windows, gcloud a veces no encuentra un Python del sistema. Si tienes
# el problema "Python was not found", exporta esto (ajusta la ruta a tu
# instalación del Cloud SDK) antes de correr cualquier script de esta carpeta:
#   export CLOUDSDK_PYTHON="<ruta al Cloud SDK>/platform/bundledpython/python.exe"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "No se encontró 'gcloud' en el PATH. Instala el Cloud SDK primero." >&2
  exit 1
fi

# --- Helpers ---------------------------------------------------------------

log() { echo ">> $*" >&2; }

confirm() {
  # confirm "mensaje" — se salta con SKIP_CONFIRM=1 (usar solo en CI/no interactivo).
  local msg="$1"
  if [[ "${SKIP_CONFIRM:-0}" == "1" ]]; then
    return 0
  fi
  read -r -p "$msg [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

resource_exists() {
  # resource_exists <comando gcloud describe...> — true si el recurso ya existe.
  "$@" >/dev/null 2>&1
}

print_config() {
  cat >&2 <<EOF
--- Configuración (ENV=$ENV) ---
PROJECT_ID       = $PROJECT_ID
REGION           = $REGION
GITHUB_REPO      = $GITHUB_REPO
SQL_INSTANCE     = $SQL_INSTANCE
SQL_DATABASE     = $SQL_DATABASE
SQL_TIER         = $SQL_TIER
SQL_AVAILABILITY = $SQL_AVAILABILITY
BUCKET_MEDIA     = $BUCKET_MEDIA
ARTIFACT_REPO    = $ARTIFACT_REPO
SERVICE_BACKEND  = $SERVICE_BACKEND
SERVICE_FRONTEND = $SERVICE_FRONTEND
DEPLOYER_SA      = $DEPLOYER_SA
RUNTIME_SA       = $RUNTIME_SA
BUDGET_AMOUNT    = \$$BUDGET_AMOUNT/mes
---------------------------------
EOF
}
