#!/usr/bin/env bash
# Fase 0 + Fase 3 — Migra datos e imágenes de un proyecto/instancia origen
# hacia el proyecto ENV de destino ya creado por los scripts 01-05. Sirve
# tanto para "instancia de prueba vieja -> stg" como para "stg -> prd".
#
# Requiere que ya exista la instancia y el bucket de destino (03-cloudsql.sh
# y 05-artifact-registry-storage.sh corridos primero).
#
# Uso:
#   ENV=stg BILLING_ACCOUNT=... \
#   SOURCE_PROJECT=project-viejo SOURCE_INSTANCE=instancia-vieja \
#   SOURCE_DB=basededatos_vieja SOURCE_BUCKET=bucket-viejo \
#     ./infra/gcp/06-migrar-datos.sh
#
# No borra NADA del origen. Dos partes independientes — si solo quieres una,
# corre SKIP_DB=1 o SKIP_IMAGES=1.

cd "$(dirname "${BASH_SOURCE[0]}")"
source ./00-lib.sh
: "${SOURCE_PROJECT:?Define SOURCE_PROJECT=<proyecto de origen>}"
: "${SOURCE_INSTANCE:?Define SOURCE_INSTANCE=<instancia de Cloud SQL de origen>}"
: "${SOURCE_DB:?Define SOURCE_DB=<nombre de la base de datos de origen>}"
print_config
log "SOURCE_PROJECT  = $SOURCE_PROJECT"
log "SOURCE_INSTANCE = $SOURCE_INSTANCE"
log "SOURCE_DB       = $SOURCE_DB"
log "SOURCE_BUCKET   = ${SOURCE_BUCKET:-'(ninguno — se salta la copia de imágenes)'}"

if [[ "${SKIP_DB:-0}" != "1" ]]; then
  STAMP="$(date +%Y%m%d-%H%M%S)"
  BACKUP_BUCKET="eltesoro-backup-temp-${STAMP}"
  BACKUP_OBJECT="eltesoro-backup-${STAMP}.sql"

  log "Fase 0 — Respaldo: exportando $SOURCE_INSTANCE/$SOURCE_DB a gs://$BACKUP_BUCKET/$BACKUP_OBJECT..."
  gcloud storage buckets create "gs://$BACKUP_BUCKET" --project="$SOURCE_PROJECT" --location="$REGION"

  SOURCE_SQL_SA="$(gcloud sql instances describe "$SOURCE_INSTANCE" --project="$SOURCE_PROJECT" --format="value(serviceAccountEmailAddress)")"
  gcloud storage buckets add-iam-policy-binding "gs://$BACKUP_BUCKET" \
    --member="serviceAccount:$SOURCE_SQL_SA" --role="roles/storage.objectAdmin" >/dev/null

  gcloud sql export sql "$SOURCE_INSTANCE" "gs://$BACKUP_BUCKET/$BACKUP_OBJECT" \
    --project="$SOURCE_PROJECT" --database="$SOURCE_DB"

  LOCAL_BACKUP="${HOME}/eltesoro-backups/eltesoro-backup-${STAMP}.sql"
  mkdir -p "$(dirname "$LOCAL_BACKUP")"
  gcloud storage cp "gs://$BACKUP_BUCKET/$BACKUP_OBJECT" "$LOCAL_BACKUP"
  log "Respaldo local: $LOCAL_BACKUP ($(wc -c < "$LOCAL_BACKUP") bytes)"

  log "Fase 3 — Importando el respaldo a $SQL_INSTANCE/$SQL_DATABASE..."
  TARGET_SQL_SA="$(gcloud sql instances describe "$SQL_INSTANCE" --project="$PROJECT_ID" --format="value(serviceAccountEmailAddress)")"
  gcloud storage buckets add-iam-policy-binding "gs://$BACKUP_BUCKET" \
    --member="serviceAccount:$TARGET_SQL_SA" --role="roles/storage.objectViewer" >/dev/null

  gcloud sql import sql "$SQL_INSTANCE" "gs://$BACKUP_BUCKET/$BACKUP_OBJECT" \
    --project="$PROJECT_ID" --database="$SQL_DATABASE" --quiet

  log "IMPORTANTE — el import deja las tablas con dueño 'cloudsqlsuperuser', no"
  log "$SQL_APP_USER. Tienes que reasignar la propiedad conectándote como"
  log "'postgres' (ponle contraseña primero: gcloud sql users set-password postgres ...)"
  log "y corriendo esto contra la base nueva:"
  log "  GRANT ${SQL_APP_USER} TO postgres;"
  log "  REASSIGN OWNED BY cloudsqlsuperuser TO ${SQL_APP_USER};"
  log "  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${SQL_APP_USER};"
  log "  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${SQL_APP_USER};"
  log "(vía Cloud SQL Auth Proxy: cloud-sql-proxy --port=5433 $(gcloud sql instances describe "$SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)'))"

  log "Verifica después con: npx prisma migrate status --schema=backend/prisma/schema.prisma"
  log "  (contra DATABASE_URL apuntando al proxy en 127.0.0.1:5433)"
fi

if [[ -n "${SOURCE_BUCKET:-}" && "${SKIP_IMAGES:-0}" != "1" ]]; then
  log "Copiando imágenes de gs://$SOURCE_BUCKET/productos a gs://$BUCKET_MEDIA/..."
  gcloud storage cp -r "gs://$SOURCE_BUCKET/productos" "gs://$BUCKET_MEDIA/"

  log "IMPORTANTE — reescribe las URLs en la base (product_images.url,"
  log "categories.imagenUrl, banners.imagenUrl, order_items.imagenUrl) que"
  log "todavía apunten a $SOURCE_BUCKET, reemplazando el nombre del bucket"
  log "por $BUCKET_MEDIA. Hazlo con una transacción SQL (UPDATE ... SET url ="
  log "replace(url, 'storage.googleapis.com/$SOURCE_BUCKET', 'storage.googleapis.com/$BUCKET_MEDIA')"
  log "WHERE url LIKE '%$SOURCE_BUCKET%') y verifica 5 URLs al azar con curl."
fi

log "Migración de datos lista (revisa las notas de arriba — hay pasos manuales de SQL)."
