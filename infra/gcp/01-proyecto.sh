#!/usr/bin/env bash
# Fase 1 — Proyecto nuevo y fundamentos: crea el proyecto de GCP, lo vincula
# a la facturación, le pone un presupuesto con alertas, y habilita las APIs
# que usa el resto de los scripts (Cloud Run, Cloud SQL, Secret Manager,
# Artifact Registry, IAM).
#
# Uso: ENV=stg BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX ./infra/gcp/01-proyecto.sh
#
# Idempotente: si el proyecto ya existe, no falla — solo avisa y sigue con
# el resto (vincular facturación, habilitar APIs sí se pueden repetir).

cd "$(dirname "${BASH_SOURCE[0]}")"
source ./00-lib.sh
print_config

if resource_exists gcloud projects describe "$PROJECT_ID"; then
  log "El proyecto $PROJECT_ID ya existe — no lo vuelvo a crear."
else
  log "Creando el proyecto $PROJECT_ID..."
  gcloud projects create "$PROJECT_ID" \
    --name="El Tesoro - $([ "$ENV" = stg ] && echo Staging || echo Producción)" \
    --labels="$LABELS"
fi

log "Vinculando facturación..."
if ! gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT" 2>/tmp/billing_link_err.txt; then
  if grep -qi "quota" /tmp/billing_link_err.txt; then
    echo "" >&2
    echo "ERROR: tu cuenta de facturación llegó al límite de proyectos vinculados" >&2
    echo "(el límite por defecto de una cuenta personal/sin organización es 5)." >&2
    echo "Revisa qué proyectos tienes vinculados con:" >&2
    echo "  gcloud billing projects list --billing-account=$BILLING_ACCOUNT" >&2
    echo "y desvincula uno que ya no uses con:" >&2
    echo "  gcloud billing projects unlink <PROJECT_ID>" >&2
    rm -f /tmp/billing_link_err.txt
    exit 1
  fi
  cat /tmp/billing_link_err.txt >&2
  rm -f /tmp/billing_link_err.txt
  exit 1
fi
rm -f /tmp/billing_link_err.txt

log "Presupuesto de \$$BUDGET_AMOUNT/mes con alertas 50/90/100%..."
# La API de presupuestos necesita habilitarse en ALGÚN proyecto que ya tenga
# facturación (el "proyecto de cuota" de tu gcloud CLI) — normalmente ya lo
# está si has usado gcloud antes; si no, habilítala en el proyecto que uses
# como quota project: gcloud services enable billingbudgets.googleapis.com
if gcloud billing budgets list --billing-account="$BILLING_ACCOUNT" \
    --format="value(displayName)" 2>/dev/null | grep -qx "El Tesoro $([ "$ENV" = stg ] && echo Staging || echo Producción)"; then
  log "El presupuesto ya existe — no lo vuelvo a crear (edítalo a mano en la consola si cambió el monto)."
else
  gcloud billing budgets create \
    --billing-account="$BILLING_ACCOUNT" \
    --display-name="El Tesoro $([ "$ENV" = stg ] && echo Staging || echo Producción)" \
    --budget-amount="$BUDGET_AMOUNT" \
    --threshold-rule=percent=0.5 \
    --threshold-rule=percent=0.9 \
    --threshold-rule=percent=1.0 \
    --filter-projects="projects/$PROJECT_ID"
fi

log "Habilitando APIs necesarias..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  sql-component.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  storage.googleapis.com \
  cloudbuild.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  --project="$PROJECT_ID"

log "Fase 1 lista. Sigue con: ENV=$ENV ./infra/gcp/02-cuentas-servicio-wif.sh"
