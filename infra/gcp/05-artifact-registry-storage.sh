#!/usr/bin/env bash
# Fase 1 (cont.) — Artifact Registry (imágenes Docker) y el bucket de
# imágenes de producto (lectura pública de OBJETOS, no del bucket completo
# — mismo esquema que hoy: las fotos se sirven directo desde Cloud Storage
# al navegador).
#
# Uso: ENV=stg BILLING_ACCOUNT=... ./infra/gcp/05-artifact-registry-storage.sh

cd "$(dirname "${BASH_SOURCE[0]}")"
source ./00-lib.sh
print_config

log "Artifact Registry ($ARTIFACT_REPO, Docker, $REGION)..."
if resource_exists gcloud artifacts repositories describe "$ARTIFACT_REPO" --project="$PROJECT_ID" --location="$REGION"; then
  log "  Ya existe."
else
  gcloud artifacts repositories create "$ARTIFACT_REPO" \
    --project="$PROJECT_ID" --repository-format=docker --location="$REGION"
fi
# Política de limpieza: conservar solo las últimas 10 imágenes. gcloud no
# tiene un flag directo para esto en `repositories create`; configúralo una
# vez desde la consola (Artifact Registry > eltesoro > Configurar limpieza)
# o con `gcloud artifacts repositories set-cleanup-policies` si tu versión
# del SDK ya lo trae.

log "Bucket de imágenes ($BUCKET_MEDIA)..."
if gcloud storage buckets describe "gs://$BUCKET_MEDIA" --project="$PROJECT_ID" >/dev/null 2>&1; then
  log "  Ya existe."
else
  gcloud storage buckets create "gs://$BUCKET_MEDIA" \
    --project="$PROJECT_ID" --location="$REGION" --uniform-bucket-level-access
fi

log "Dando lectura pública de OBJETOS (no del bucket) — esto expone las fotos"
log "de producto a cualquiera en internet, que es lo esperado para un catálogo"
log "público. Confírmalo si corres este script sin SKIP_CONFIRM=1."
if confirm "¿Dar lectura pública (roles/storage.objectViewer a allUsers) a gs://$BUCKET_MEDIA?"; then
  gcloud storage buckets add-iam-policy-binding "gs://$BUCKET_MEDIA" \
    --member=allUsers --role=roles/storage.objectViewer
else
  log "  Saltado — el sitio no podrá mostrar fotos de producto hasta que corras ese comando a mano:"
  log "    gcloud storage buckets add-iam-policy-binding gs://$BUCKET_MEDIA --member=allUsers --role=roles/storage.objectViewer"
fi

log "Fase 1 (Artifact Registry + Storage) lista."
log "Ya puedes construir y desplegar — ver infra/gcp/README.md, sección 'Primer despliegue'."
