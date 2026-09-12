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

COPY --from=build --chown=node:node /app/shared/dist shared/dist
COPY --from=build --chown=node:node /app/backend/dist backend/dist
COPY --from=build --chown=node:node /app/backend/prisma backend/prisma
COPY --from=build --chown=node:node /app/node_modules/.prisma node_modules/.prisma
COPY --from=build --chown=node:node /app/node_modules/@prisma/client node_modules/@prisma/client
COPY --chown=node:node backend/scripts backend/scripts

WORKDIR /app/backend

# INF-10: sin esto el contenedor corre como root — si alguien compromete el
# proceso Node, hereda privilegios de root dentro del contenedor. La imagen
# node:20-slim ya trae el usuario "node" (uid 1000) sin privilegios.
USER node

EXPOSE 8080
CMD ["node", "dist/index.js"]
