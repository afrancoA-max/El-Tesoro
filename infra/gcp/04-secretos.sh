#!/usr/bin/env bash
# Fase 4 — Secretos de la aplicación (aparte de DATABASE_URL, que crea
# 03-cloudsql.sh): JWT_ACCESS_SECRET (nuevo, generado), INTERNAL_PROXY_SECRET
# (nuevo, generado) y BREVO_API_KEY (copiado de otro proyecto si lo indicas,
# o puedes pegarlo a mano — nunca se commitea ni se muestra en pantalla).
#
# Uso normal (genera JWT e INTERNAL_PROXY_SECRET nuevos):
#   ENV=stg BILLING_ACCOUNT=... ./infra/gcp/04-secretos.sh
#
# Para copiar BREVO_API_KEY de otro proyecto (ej. staging -> producción):
#   ENV=prd BILLING_ACCOUNT=... COPY_BREVO_FROM_PROJECT=diginet-eltesoro-stg \
#     ./infra/gcp/04-secretos.sh

cd "$(dirname "${BASH_SOURCE[0]}")"
source ./00-lib.sh
print_config

create_or_update_generated_secret() {
  # create_or_update_generated_secret <nombre-secreto>
  local secret_name="$1"
  if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    log "  $secret_name ya existe — no lo regenero (bórralo primero si quieres rotarlo)."
    return
  fi
  local value tmp_file
  value="$(openssl rand -hex 32)"
  tmp_file="$(mktemp)"
  printf '%s' "$value" > "$tmp_file"
  unset value
  gcloud secrets create "$secret_name" --project="$PROJECT_ID" --replication-policy=automatic
  gcloud secrets versions add "$secret_name" --project="$PROJECT_ID" --data-file="$tmp_file"
  rm -f "$tmp_file"
  grant_secret_access "$secret_name"
  log "  $secret_name creado (valor generado con openssl, nunca mostrado)."
}

grant_secret_access() {
  local secret_name="$1"
  gcloud secrets add-iam-policy-binding "$secret_name" --project="$PROJECT_ID" \
    --member="serviceAccount:$RUNTIME_SA" --role="roles/secretmanager.secretAccessor" >/dev/null
  gcloud secrets add-iam-policy-binding "$secret_name" --project="$PROJECT_ID" \
    --member="serviceAccount:$DEPLOYER_SA" --role="roles/secretmanager.secretAccessor" >/dev/null
}

log "JWT_ACCESS_SECRET..."
create_or_update_generated_secret "eltesoro-${ENV}-jwt-access-secret"

log "INTERNAL_PROXY_SECRET..."
create_or_update_generated_secret "eltesoro-${ENV}-internal-proxy-secret"

BREVO_SECRET="eltesoro-${ENV}-brevo-api-key"
if gcloud secrets describe "$BREVO_SECRET" --project="$PROJECT_ID" >/dev/null 2>&1; then
  log "$BREVO_SECRET ya existe — no lo toco."
elif [[ -n "${COPY_BREVO_FROM_PROJECT:-}" ]]; then
  log "Copiando BREVO_API_KEY desde $COPY_BREVO_FROM_PROJECT (sin mostrarla)..."
  SRC_SECRET="eltesoro-${COPY_BREVO_FROM_SECRET_ENV:-$ENV}-brevo-api-key"
  tmp_file="$(mktemp)"
  gcloud secrets versions access latest --secret="$SRC_SECRET" --project="$COPY_BREVO_FROM_PROJECT" > "$tmp_file"
  gcloud secrets create "$BREVO_SECRET" --project="$PROJECT_ID" --replication-policy=automatic
  gcloud secrets versions add "$BREVO_SECRET" --project="$PROJECT_ID" --data-file="$tmp_file"
  rm -f "$tmp_file"
  grant_secret_access "$BREVO_SECRET"
  log "  $BREVO_SECRET copiado."
else
  log "$BREVO_SECRET no existe y no diste COPY_BREVO_FROM_PROJECT."
  log "  Créalo a mano (la API key sale de https://app.brevo.com/settings/keys/api):"
  log "    printf '%s' 'TU_API_KEY' | gcloud secrets create $BREVO_SECRET --project=$PROJECT_ID --data-file=-"
  log "  Luego dale acceso:"
  log "    gcloud secrets add-iam-policy-binding $BREVO_SECRET --project=$PROJECT_ID --member=serviceAccount:$RUNTIME_SA --role=roles/secretmanager.secretAccessor"
fi

log "Fase 4 (secretos) lista. Sigue con: ENV=$ENV ./infra/gcp/05-artifact-registry-storage.sh"
