#!/usr/bin/env bash
# Fase 2 — Cloud SQL: instancia de PostgreSQL, base de datos, usuario propio
# de la aplicación (nunca "postgres"), y el secreto DATABASE_URL en formato
# socket (Cloud SQL connector) listo para Cloud Run.
#
# stg por defecto: db-f1-micro, ZONAL (sin HA) — barato, sin SLA, no usar en
# producción. prd por defecto: db-g1-small, REGIONAL (con HA) — súbelo si
# esperas más tráfico (override con SQL_TIER=... antes de correr el script).
#
# Uso: ENV=stg BILLING_ACCOUNT=... ./infra/gcp/03-cloudsql.sh

cd "$(dirname "${BASH_SOURCE[0]}")"
source ./00-lib.sh
print_config

if resource_exists gcloud sql instances describe "$SQL_INSTANCE" --project="$PROJECT_ID"; then
  log "La instancia $SQL_INSTANCE ya existe — no la vuelvo a crear."
else
  log "Creando la instancia Cloud SQL $SQL_INSTANCE (esto tarda varios minutos)..."
  gcloud sql instances create "$SQL_INSTANCE" \
    --project="$PROJECT_ID" \
    --database-version=POSTGRES_18 \
    --edition=ENTERPRISE \
    --tier="$SQL_TIER" \
    --region="$REGION" \
    --availability-type="$SQL_AVAILABILITY" \
    --storage-type=SSD \
    --storage-size="$SQL_DISK_GB" \
    --storage-auto-increase \
    --backup-start-time=07:00 \
    --retained-backups-count=7 \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=8 \
    --deletion-protection \
    --connector-enforcement=REQUIRED
  # Nota: esta versión de gcloud no soporta --labels en `sql instances
  # create`; si tu versión sí lo soporta, agrégalo con --labels="$LABELS".

  if [[ "$ENV" == "prd" ]]; then
    log "prd: activando recuperación a un punto en el tiempo (PITR)..."
    gcloud sql instances patch "$SQL_INSTANCE" --project="$PROJECT_ID" \
      --enable-point-in-time-recovery --quiet
  fi
fi

CONNECTION_NAME="$(gcloud sql instances describe "$SQL_INSTANCE" --project="$PROJECT_ID" --format="value(connectionName)")"
log "connectionName = $CONNECTION_NAME"

if gcloud sql databases describe "$SQL_DATABASE" --instance="$SQL_INSTANCE" --project="$PROJECT_ID" >/dev/null 2>&1; then
  log "La base $SQL_DATABASE ya existe."
else
  log "Creando la base $SQL_DATABASE..."
  gcloud sql databases create "$SQL_DATABASE" --instance="$SQL_INSTANCE" --project="$PROJECT_ID"
fi

DB_URL_SECRET="eltesoro-${ENV}-database-url"

if gcloud sql users list --instance="$SQL_INSTANCE" --project="$PROJECT_ID" --format="value(name)" | grep -qx "$SQL_APP_USER"; then
  log "El usuario $SQL_APP_USER ya existe — no genero una contraseña nueva ni toco el secreto."
  log "(Si necesitas rotar la contraseña, hazlo a mano: gcloud sql users set-password ... y actualiza el secreto $DB_URL_SECRET.)"
else
  log "Creando el usuario de la app ($SQL_APP_USER) con una contraseña generada..."
  DB_PASS="$(openssl rand -hex 24)"
  gcloud sql users create "$SQL_APP_USER" --instance="$SQL_INSTANCE" --project="$PROJECT_ID" --password="$DB_PASS"

  # connection_limit=5: db-f1-micro/db-g1-small admiten pocas conexiones
  # simultáneas — verifica el máximo real con
  #   SELECT * FROM pg_settings WHERE name='max_connections';
  # y ajusta si hace falta.
  DATABASE_URL="postgresql://${SQL_APP_USER}:${DB_PASS}@localhost/${SQL_DATABASE}?host=/cloudsql/${CONNECTION_NAME}&connection_limit=5"
  unset DB_PASS

  TMP_URL_FILE="$(mktemp)"
  printf '%s' "$DATABASE_URL" > "$TMP_URL_FILE"
  unset DATABASE_URL

  if gcloud secrets describe "$DB_URL_SECRET" --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud secrets versions add "$DB_URL_SECRET" --project="$PROJECT_ID" --data-file="$TMP_URL_FILE"
  else
    gcloud secrets create "$DB_URL_SECRET" --project="$PROJECT_ID" --replication-policy=automatic
    gcloud secrets versions add "$DB_URL_SECRET" --project="$PROJECT_ID" --data-file="$TMP_URL_FILE"
  fi
  rm -f "$TMP_URL_FILE"

  gcloud secrets add-iam-policy-binding "$DB_URL_SECRET" --project="$PROJECT_ID" \
    --member="serviceAccount:$RUNTIME_SA" --role="roles/secretmanager.secretAccessor" >/dev/null
  gcloud secrets add-iam-policy-binding "$DB_URL_SECRET" --project="$PROJECT_ID" \
    --member="serviceAccount:$DEPLOYER_SA" --role="roles/secretmanager.secretAccessor" >/dev/null

  log "Secreto $DB_URL_SECRET creado. La contraseña NUNCA se mostró en esta terminal ni se escribió en el repo."
fi

log "Fase 2 lista. Sigue con: ENV=$ENV ./infra/gcp/04-secretos.sh"
