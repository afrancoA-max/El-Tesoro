# Frontend catálogo navegable — Módulo 03. Build multi-stage con salida
# `standalone` de Next.js (self-contained, sin necesitar node_modules completo
# en runtime). Las variables NEXT_PUBLIC_* se inyectan como build ARG porque
# Next.js las incrusta en el bundle de cliente en tiempo de build, no de
# arranque — deben pasarse a `docker build`, no solo como env var del contenedor.
# PRODUCT_IMAGES_BUCKET también debe pasarse como build ARG (no solo env var
# de Cloud Run): next.config.ts define `images.remotePatterns` a partir de
# esta variable, y Next.js congela esa configuración en el build standalone
# — no se relee al arrancar el servidor (detectado en la migración a
# diginet-eltesoro-stg del 2026-09-26: con el bucket solo como env var de
# Cloud Run, el optimizador de imágenes rechazaba todas las fotos con 400).
FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --ignore-scripts

COPY shared shared
COPY frontend frontend
RUN npm run build --workspace=shared

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG PRODUCT_IMAGES_BUCKET
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV PRODUCT_IMAGES_BUCKET=${PRODUCT_IMAGES_BUCKET}
RUN npm run build --workspace=frontend

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build --chown=node:node /app/frontend/.next/standalone ./
COPY --from=build --chown=node:node /app/frontend/public ./frontend/public
COPY --from=build --chown=node:node /app/frontend/.next/static ./frontend/.next/static

# INF-10: no correr como root dentro del contenedor.
USER node

EXPOSE 8080
CMD ["node", "frontend/server.js"]
