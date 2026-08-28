# Backend API de catálogo — Módulo 02. Build multi-stage: se compila con
# devDependencies, se corre solo con dependencias de producción.
FROM node:20-slim AS build
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY backend/package.json backend/package.json
RUN npm ci --ignore-scripts

COPY shared shared
COPY backend backend
RUN npm run prisma:generate --workspace=backend
RUN npm run build --workspace=shared
RUN npm run build --workspace=backend

FROM node:20-slim AS runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY backend/package.json backend/package.json
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/backend/prisma backend/prisma
COPY --from=build /app/node_modules/.prisma node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client node_modules/@prisma/client
COPY backend/scripts backend/scripts

WORKDIR /app/backend

EXPOSE 8080
CMD ["node", "dist/index.js"]
