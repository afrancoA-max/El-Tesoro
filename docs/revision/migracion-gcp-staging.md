# Migración de staging a un proyecto de Google Cloud nuevo — El Tesoro

- **Fecha:** 11 de septiembre de 2026
- **Motivo:** la base de datos de staging (`proyectoalmaceneltesoro`, en el proyecto `project-26c70338-0265-4c7e-837`) es una **instancia de prueba gratuita de Cloud SQL**. Estas instancias duran 30 días; al terminar **dejan de responder** (los datos se guardan 90 días más y luego se borran) y no tienen backups. Se creó alrededor del 28-ago, así que vencería cerca del **27-sep**.
- **Fecha límite interna:** tener la migración terminada el **jueves 24-sep** (deja margen).

---

## 1. Qué vamos a hacer y por qué

Hay dos caminos:

| Opción | Qué implica | Cuándo usarla |
|---|---|---|
| **A. Actualizar la prueba en el mismo proyecto** | Un clic en la consola: la instancia pasa a ser de pago, sin perder datos ni tener caída. | **Solo como red de seguridad** si al 24-sep la migración no está lista. |
| **B. Proyecto nuevo y dedicado (la elegida)** | Se crea `diginet-eltesoro-stg` con todo configurado de forma profesional y se migran la base, las imágenes, los secretos y los servicios. | Ahora. |

**Por qué B es lo profesional:**

- El proyecto actual tiene un nombre autogenerado y mezcla cosas hechas "a prueba y error".
- Un proyecto por cliente y por entorno te da facturación y presupuesto separados por cliente (útil para cobrar el mantenimiento), permisos aislados y un inventario claro.
- Además, lo que construyas aquí lo repites igual para producción (Módulo 09, `diginet-eltesoro-prd`) y para tus otros clientes (DICOCE, la clínica).

Aprovechando que todo se recrea, esta migración también resuelve estos puntos del informe `revision-modulos-01-05.md`:

- **INF-01:** desarrollo local con base propia.
- **INF-02:** cuenta de servicio de runtime separada.
- **INF-03:** el deploy corre solo si pasa el CI.
- **INF-06:** `min-instances=0` en staging.
- **INF-08:** bucket y dominios configurables por variables de entorno.
- **SEG-05:** CORS limitado a la URL del frontend.

---

## 2. Cómo queda staging

| Recurso | Nombre propuesto | Configuración |
|---|---|---|
| Proyecto | `diginet-eltesoro-stg` | Labels `client=eltesoro, env=stg, owner=diginet`; presupuesto de US$25/mes con alertas al 50/90/100 % |
| Región | `us-central1` | Igual que hoy (la de precio más bajo) |
| Cloud SQL | `eltesoro-db-stg` | PostgreSQL (misma versión mayor que la actual), edición **Enterprise**, `db-f1-micro`, 10 GB SSD con auto-incremento, backups diarios (7 días), ventana de mantenimiento domingo de madrugada (hora de Guatemala), protección contra borrado |
| Seguridad de la base | — | IP pública **sin redes autorizadas**, solo conexiones por Cloud SQL connector, SSL obligatorio, usuario propio de la aplicación (no `postgres`) |
| Base de datos | `eltesoro_staging` | Datos migrados desde la instancia de prueba |
| Imágenes | bucket `diginet-eltesoro-stg-media` | Acceso uniforme, lectura pública solo de objetos (como hoy) |
| Contenedores | Artifact Registry `eltesoro` | Política de limpieza: conservar las últimas 10 imágenes |
| Secretos | Secret Manager | `DATABASE_URL`, `JWT_ACCESS_SECRET` (nuevo), `BREVO_API_KEY` (copiado), contraseñas de la base |
| Backend | Cloud Run `eltesoro-api-stg` | min 0 / max 2 instancias, corre con `eltesoro-runtime` |
| Frontend | Cloud Run `eltesoro-web-stg` | min 0 / max 2 instancias, corre con `eltesoro-runtime` |
| Cuentas de servicio | `eltesoro-deployer` / `eltesoro-runtime` | El deployer solo despliega (GitHub Actions). El runtime solo tiene Cloud SQL Client, Secret Accessor y acceso al bucket |
| GitHub Actions | Workload Identity Federation | Restringido al repo `afrancoA-max/El-Tesoro`, sin llaves JSON |
| Infraestructura como código | `infra/gcp/*.sh` + `infra/gcp/README.md` | Scripts idempotentes parametrizados por entorno (`ENV=stg`, luego `prd`) |

### Costo mensual estimado de staging (precios de lista de Google, us-central1)

| Concepto | USD/mes aprox. |
|---|---|
| Cloud SQL `db-f1-micro` | 7.70 |
| 10 GB SSD | 1.70 |
| Backups (~1–2 GB) | 0.10–0.20 |
| Cloud Run con min 0 y poco tráfico | ~0 (cubierto por el nivel gratuito) |
| Storage de imágenes + Artifact Registry | < 1 |
| **Total** | **≈ US$10–12 (≈ Q80–95)** |

> **Por qué "Enterprise":** en Cloud SQL solo existen dos ediciones: **Enterprise** (la básica y más barata) y **Enterprise Plus** (la premium, que es la de la prueba actual). No hay una menor; los tamaños compartidos `db-f1-micro` y `db-g1-small` solo existen en Enterprise.
>
> `db-f1-micro` **no tiene SLA** de Google: está bien para staging, no para producción. En el Módulo 09 se decide el tamaño de producción (`db-g1-small` ≈ US$26/mes, o una instancia dedicada de 1 vCPU si quieres SLA).

---

## 3. Decisiones que Claude Code te va a preguntar (respuesta recomendada)

1. **ID del proyecto:** `diginet-eltesoro-stg` (debe ser único en todo Google; si está tomado, `diginet-eltesoro-stg-01`).
2. **¿Crear producción ahora?** No. Se crea en el Módulo 09 con los mismos scripts.
3. **Región:** `us-central1`.
4. **Cuenta de facturación:** la tuya o la de DIGINET. Que Claude Code revise si es una cuenta de prueba de US$300; esa es otra prueba distinta que también vence.
5. **Organización de Google Cloud:** opcional. Si más adelante verificas el dominio de DIGINET con Cloud Identity Free (gratis), puedes tener una carpeta por cliente. No bloquea nada.

## 4. Qué necesitas tener listo

- `gcloud` instalado en tu PC con tu cuenta dueña del proyecto (`gcloud auth login` y `gcloud auth application-default login`). Alternativa: correr los comandos en **Cloud Shell**, que ya trae `gcloud` y las herramientas de PostgreSQL.
- Permiso de administrador en la cuenta de facturación.
- Unas 2–3 horas con la compu disponible. Staging puede quedar unos minutos sin servicio durante el cambio (no afecta a nadie, no es producción).
- **No cambies nada del proyecto viejo** hasta la limpieza final (prompt 3).

## 5. Red de seguridad

- Hoy mismo (Fase 0) se hace un **export completo** de la base actual.
- Si el 24-sep la migración no está terminada, **actualiza la instancia de prueba en la consola** (opción A, unos US$8–10/mes): no pierdes datos y terminas la migración con calma. Una vez vencida, sin actualizarla no se puede exportar nada.

---

## 6. Prompts para Claude Code

Usa **una conversación para los prompts 1 y 2** (son continuos) y otra, **7 días después**, para el prompt 3.

### Prompt 1 — Diagnóstico, respaldo, proyecto nuevo y base de datos
```
Vamos a mover el entorno de staging de El Tesoro a un proyecto de Google Cloud nuevo y dedicado, porque la base actual (Cloud SQL "proyectoalmaceneltesoro" en el proyecto project-26c70338-0265-4c7e-837) es una instancia de prueba gratuita de 30 días que está por vencer. Lee completo docs/revision/migracion-gcp-staging.md y la skill retail-gcp-deployment-devops antes de empezar.

Reglas generales:
- Trabaja por fases y DETENTE al final de cada una para que yo confirme. No borres ni modifiques NADA del proyecto viejo.
- Todo lo que crees en GCP debe quedar como scripts idempotentes en infra/gcp/ (bash + gcloud), parametrizados por entorno (ENV=stg ahora, reutilizables para ENV=prd en el Módulo 09), con un infra/gcp/README.md tipo runbook. Ningún paso manual sin documentar.
- Nunca muestres contraseñas ni secretos en la conversación ni los escribas en archivos del repo: genéralos con openssl y pásalos directo a Secret Manager.
- Labels en todos los recursos: client=eltesoro, env=stg, owner=diginet.

Fase 0 — Diagnóstico y respaldo inmediato:
1. Dime la fecha exacta en que vence la prueba de la instancia actual, su versión de PostgreSQL, el tamaño de la base y cuántas filas tienen products, product_variants, product_images, users, carts, cart_items y newsletter_subscribers.
2. Exporta la base actual a un archivo .sql (gcloud sql export sql a un bucket, o pg_dump vía Cloud SQL Auth Proxy) y guarda también una copia en mi computadora FUERA del repo. Verifica que el archivo tenga contenido.
3. Haz un inventario de todo lo que existe en el proyecto viejo (Cloud Run, Cloud SQL, buckets, secretos, Artifact Registry, cuentas de servicio, Workload Identity) para saber qué hay que recrear.

Fase 1 — Proyecto nuevo y fundamentos:
- Crea el proyecto diginet-eltesoro-stg (confírmame el ID antes) vinculado a mi cuenta de facturación; revisa si esa cuenta es de prueba gratuita y avísame.
- Presupuesto de US$25/mes con alertas al 50/90/100 % a mi correo.
- Habilita solo las APIs necesarias.
- Dos cuentas de servicio: eltesoro-deployer (solo para GitHub Actions: desplegar Cloud Run, subir imágenes a Artifact Registry, actuar como eltesoro-runtime) y eltesoro-runtime (con la que corren los servicios: Cloud SQL Client, Secret Accessor solo sobre sus secretos, y acceso al bucket de imágenes).
- Workload Identity Federation para GitHub Actions, con attribute condition restringida al repositorio afrancoA-max/El-Tesoro. Sin llaves JSON.
- Artifact Registry "eltesoro" (Docker, us-central1) con política de limpieza que conserve las últimas 10 imágenes.
- Bucket diginet-eltesoro-stg-media con acceso uniforme y lectura pública solo de objetos.
Detente y muéstrame lo creado.

Fase 2 — Cloud SQL nueva:
- Instancia eltesoro-db-stg: PostgreSQL con la MISMA versión mayor que la vieja, edición Enterprise, tier db-f1-micro, us-central1, 10 GB SSD con auto-incremento.
- Backups automáticos diarios (retener 7), ventana de mantenimiento domingo de madrugada hora de Guatemala, protección contra borrado activada.
- IP pública SIN redes autorizadas, connector enforcement en "solo Cloud SQL connectors" y SSL requerido.
- Base eltesoro_staging y un usuario propio de la aplicación (la app no usa "postgres"). Contraseñas generadas y guardadas en Secret Manager. Secreto DATABASE_URL con formato de socket (?host=/cloudsql/PROYECTO:REGION:INSTANCIA) e incluye connection_limit=5 para Prisma (db-f1-micro admite pocas conexiones simultáneas; revisa max_connections real con SELECT * FROM pg_settings WHERE name='max_connections' y ajústalo si hace falta).
Detente y muéstrame un resumen de la configuración final.
```

### Prompt 2 — Migrar datos e imágenes, desplegar y verificar
```
Continuamos la migración (docs/revision/migracion-gcp-staging.md), fases 3 a 5, con las mismas reglas.

Fase 3 — Datos e imágenes:
1. Importa el respaldo en la instancia nueva. Si pasó más de un día desde la Fase 0, exporta de nuevo antes. Verifica que todos los objetos queden con permisos para el usuario de la aplicación.
2. Compara el conteo de filas tabla por tabla contra la instancia vieja, y corre `prisma migrate status` contra la nueva: debe indicar que todas las migraciones están aplicadas.
3. Copia todas las imágenes del bucket viejo (eltesoro-product-images-staging) al nuevo, y reescribe en la base las URLs que apuntan al bucket viejo (product_images.url y cualquier otra columna con URLs de imagen) con un UPDATE dentro de una transacción. Dime cuántas filas cambiaron y verifica 5 URLs al azar.
4. Haz configurable por variables de entorno lo que hoy está fijo: el bucket por defecto de scripts/import-catalog.ts y remotePatterns/allowedDevOrigins de frontend/next.config.ts.
Detente.

Fase 4 — Servicios y CI/CD:
1. Actualiza los workflows de GitHub Actions al proyecto nuevo: WIF nuevo, deployer nuevo, --service-account=eltesoro-runtime en los servicios, secretos nuevos, labels. Aprovecha para: min-instances=0 en staging, que el deploy corra solo si el CI pasó (workflow_run o needs), y CORS_ORIGINS con la URL exacta del frontend nuevo.
2. Genera un JWT_ACCESS_SECRET nuevo para este proyecto y copia BREVO_API_KEY del proyecto viejo al Secret Manager del nuevo sin mostrarla.
3. Despliega backend (eltesoro-api-stg) y frontend (eltesoro-web-stg), y actualiza FRONTEND_URL, API_URL y SITE_URL con las URLs nuevas.
4. Cambia mi backend/.env local para que apunte a la base local de infra/docker-compose.yml, y crea backend/.env.staging (ignorado por git) solo para correr el importador contra staging, con un comentario de advertencia arriba.
Detente.

Fase 5 — Verificación. Entrégame esta tabla con OK/FALLA y evidencia:
- Home, una categoría, una ficha de producto y la búsqueda cargan con imágenes desde el bucket nuevo.
- Registro con un correo real mío → llega el correo de verificación con enlace al frontend NUEVO → verificar → iniciar sesión.
- Carrito: agregar, cambiar cantidad, fusión de carrito anónimo con la cuenta.
- /staff/inventario funciona con un usuario autorizado.
- Los logs de Cloud Run no muestran errores de conexión a la base.
- `gcloud run services describe` muestra que ambos servicios corren con eltesoro-runtime.
- Un push de prueba a main pasa el CI y después despliega solo.
- El presupuesto y las alertas están activos.
Actualiza backend/README.md (tabla de infraestructura) y docs/revision/revision-modulos-01-05.md marcando como resueltos INF-01, INF-02, INF-03, INF-06, INF-08 y SEG-05.
```

### Prompt 3 — Limpieza del proyecto viejo (7 días después, si todo funciona)
```
Ya pasaron 7 días con staging funcionando en diginet-eltesoro-stg. Limpia el proyecto viejo project-26c70338-0265-4c7e-837, pidiéndome confirmación ANTES de cada borrado:
1. Export final de la base vieja al bucket nuevo, carpeta archive/, como respaldo histórico.
2. Confirma que ninguna URL de la base nueva apunta todavía al bucket viejo.
3. Borra los servicios de Cloud Run viejos, las imágenes de Artifact Registry, el bucket viejo de imágenes, los secretos, el pool de Workload Identity y la cuenta de servicio de deploy vieja.
4. Borra la instancia de prueba de Cloud SQL sin backup final pagado (ya tenemos el export).
5. NO borres el proyecto en sí sin preguntarme: puede tener otras cosas mías.
Al final confirma que el proyecto viejo ya no genera costos.
```

---

## 7. Qué sigue en el Módulo 09 (producción)

Se corren los mismos scripts de `infra/gcp/` con `ENV=prd` para crear `diginet-eltesoro-prd`, con estas diferencias:

- Base con SLA (`db-g1-small` como mínimo, o una dedicada) y recuperación a un punto en el tiempo (PITR) activada.
- `min-instances=1` solo en el frontend.
- Dominio propio.
- Remitente de correo con dominio verificado (INF-05).
