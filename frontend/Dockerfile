# Frontend catálogo navegable — Módulo 03. Build multi-stage con salida
# `standalone` de Next.js (self-contained, sin necesitar node_modules completo
# en runtime). Las variables NEXT_PUBLIC_* se inyectan como build ARG porque
# Next.js las incrusta en el bundle de cliente en tiempo de build, no de
# arranque — deben pasarse a `docker build`, no solo como env var del contenedor.
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
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
RUN npm run build --workspace=frontend

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build /app/frontend/.next/standalone ./
COPY --from=build /app/frontend/public ./frontend/public
COPY --from=build /app/frontend/.next/static ./frontend/.next/static

EXPOSE 8080
CMD ["node", "frontend/server.js"]
