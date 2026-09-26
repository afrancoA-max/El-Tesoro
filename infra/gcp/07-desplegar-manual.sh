#!/usr/bin/env bash
# Despliegue manual (backend + frontend) usando Cloud Build, sin depender de
# Docker local ni de GitHub Actions. Útil para el primer despliegue de un
# entorno nuevo, antes de que los workflows de CI/CD estén actualizados y
# probados — así no queda un ENV a medias esperando un push a main.
#
# Para el día a día, una vez el entorno ya funciona, usa los workflows de
# GitHub Actions (.github/workflows/deploy-staging*.yml, actualizados a
# mano con los valores que imprime 02-cuentas-servicio-wif.sh).
#
# Uso: ENV=stg BILLING_ACCOUNT=... ./infra/gcp/07-desplegar-manual.sh
# Corre desde la raíz del repo (usa `.` como contexto de build).

cd "$(dirname "${BASH_SOURCE[0]}")"
source ./00-lib.sh
cd ../..  # raíz del repo

print_config

CONNECTION_NAME="$(gcloud sql instances describe "$SQL_INSTANCE" --project="$PROJECT_ID" --format="value(connectionName)")"
API_URL="https://${SERVICE_BACKEND}-$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)').${REGION}.run.app"
SITE_URL="https://${SERVICE_FRONTEND}-$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)').${REGION}.run.app"

log "Construyendo el backend con Cloud Build..."
BACKEND_CONFIG="$(mktemp).yaml"
cat > "$BACKEND_CONFIG" <<EOF
steps:
  - name: "gcr.io/cloud-builders/docker"
    args: ["build", "-f", "backend/Dockerfile", "-t", "${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/api:manual", "."]
images: ["${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/api:manual"]
options: {logging: CLOUD_LOGGING_ONLY}
EOF
gcloud builds submit --project="$PROJECT_ID" --config="$BACKEND_CONFIG" .
rm -f "$BACKEND_CONFIG"

log "Desplegando el backend a Cloud Run ($SERVICE_BACKEND)..."
gcloud run deploy "$SERVICE_BACKEND" \
  --image="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/api:manual" \
  --project="$PROJECT_ID" --region="$REGION" --platform=managed --allow-unauthenticated \
  --add-cloudsql-instances="$CONNECTION_NAME" \
  --set-secrets="DATABASE_URL=eltesoro-${ENV}-database-url:latest,JWT_ACCESS_SECRET=eltesoro-${ENV}-jwt-access-secret:latest,BREVO_API_KEY=eltesoro-${ENV}-brevo-api-key:latest,INTERNAL_PROXY_SECRET=eltesoro-${ENV}-internal-proxy-secret:latest" \
  --set-env-vars="NODE_ENV=production,CORS_ORIGINS=${SITE_URL},FRONTEND_URL=${SITE_URL}" \
  --min-instances=0 --max-instances=3 --memory=512Mi \
  --service-account="$RUNTIME_SA"

log "Construyendo el frontend con Cloud Build..."
log "(PRODUCT_IMAGES_BUCKET debe ir como build ARG, no solo env var de Cloud"
log "Run — Next.js congela images.remotePatterns en el build standalone.)"
FRONTEND_CONFIG="$(mktemp).yaml"
cat > "$FRONTEND_CONFIG" <<EOF
steps:
  - name: "gcr.io/cloud-builders/docker"
    args:
      - build
      - -f
      - frontend/Dockerfile
      - --build-arg
      - NEXT_PUBLIC_API_URL=${API_URL}/api
      - --build-arg
      - NEXT_PUBLIC_SITE_URL=${SITE_URL}
      - --build-arg
      - PRODUCT_IMAGES_BUCKET=${BUCKET_MEDIA}
      - -t
      - ${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/web:manual
      - .
images: ["${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/web:manual"]
options: {logging: CLOUD_LOGGING_ONLY}
EOF
gcloud builds submit --project="$PROJECT_ID" --config="$FRONTEND_CONFIG" .
rm -f "$FRONTEND_CONFIG"

log "Desplegando el frontend a Cloud Run ($SERVICE_FRONTEND)..."
gcloud run deploy "$SERVICE_FRONTEND" \
  --image="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/web:manual" \
  --project="$PROJECT_ID" --region="$REGION" --platform=managed --allow-unauthenticated --port=8080 \
  --set-env-vars="API_PROXY_TARGET=${API_URL},PRODUCT_IMAGES_BUCKET=${BUCKET_MEDIA}" \
  --set-secrets="INTERNAL_PROXY_SECRET=eltesoro-${ENV}-internal-proxy-secret:latest" \
  --min-instances=0 --max-instances=3 --memory=512Mi \
  --service-account="$RUNTIME_SA"

log "Listo:"
log "  Backend:  $API_URL"
log "  Frontend: $SITE_URL"
