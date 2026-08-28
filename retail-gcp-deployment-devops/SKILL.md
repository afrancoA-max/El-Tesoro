---
name: retail-gcp-deployment-devops
description: Despliegue e infraestructura en Google Cloud Platform para la tienda de hogar — elección de servicios de cómputo (Cloud Run/App Engine), base de datos gestionada, almacenamiento de imágenes, dominio y HTTPS, variables de entorno/secretos, CI/CD, entornos de staging/producción, y monitoreo. Úsala SIEMPRE que se trabaje en desplegar el frontend o backend, configurar un servicio de GCP, conectar dominio, manejar credenciales/secretos de producción, automatizar despliegues, o diagnosticar un problema de infraestructura ya en la nube. No la uses para el código de la aplicación en sí (usa las skills de frontend/backend correspondientes) — esta skill se activa cuando el código ya existe y debe salir a internet, o cuando se configura el entorno que lo va a correr.
---

# Retail Hogar E-commerce — Despliegue en Google Cloud

Esta skill cubre cómo el proyecto sale a producción en Google Cloud. Está escrita asumiendo que quien la usa **no ha desplegado antes en un proveedor cloud** — cada decisión incluye el motivo, no solo el "qué hacer", para que las elecciones se entiendan y no solo se copien.

---

## 1. Mapa de servicios de GCP que usa el proyecto

| Necesidad | Servicio GCP | Por qué |
|---|---|---|
| Correr el backend (API Node.js) | **Cloud Run** | Serverless: no se administra servidor, escala automáticamente (incluso a cero cuando no hay tráfico, lo que reduce costo al inicio) |
| Correr el frontend (Next.js con SSR) | **Cloud Run** (contenedor Next.js) | Next.js necesita un entorno Node corriendo para SSR — Cloud Run es el fit natural, mismo modelo que el backend |
| Base de datos | **Cloud SQL (PostgreSQL)** | Gestionado por Google: backups automáticos, parches de seguridad, sin administrar el servidor de base de datos manualmente |
| Imágenes de producto | **Cloud Storage** (bucket) | Almacenamiento de archivos económico y duradero, diseñado para servir assets estáticos |
| Entrega rápida de imágenes | **Cloud CDN** delante del bucket | Cachea imágenes cerca del usuario final, acelera la carga del catálogo |
| Dominio propio + HTTPS | **Cloud Load Balancer** con certificado SSL administrado, o **Firebase Hosting** con dominio personalizado si se simplifica el frontend | HTTPS es obligatorio para cualquier sitio transaccional (y requisito de las pasarelas de pago) |
| Secretos (contraseñas de DB, llaves de la pasarela de pago) | **Secret Manager** | Nunca en archivos `.env` subidos al repositorio ni hardcoded en el código |
| Automatizar despliegues | **Cloud Build** o **GitHub Actions** (ver sección 5) | Evita desplegar manualmente cada cambio, reduce error humano |
| Monitoreo y logs | **Cloud Logging** + **Cloud Monitoring** | Ver errores en producción y recibir alertas sin tener que "adivinar" qué falló |

**Por qué Cloud Run y no App Engine o GKE:** App Engine es válido pero menos flexible para correr contenedores personalizados (útil si en el futuro se necesita algo muy específico); GKE (Kubernetes) es para proyectos con necesidades de orquestación complejas que este proyecto no tiene todavía — introduce complejidad operativa innecesaria para una tienda que está empezando. Cloud Run da el mejor balance de simplicidad y capacidad de crecer.

---

## 2. Arquitectura de despliegue (vista general)

```
                         Usuario (navegador)
                                │
                        Dominio propio (HTTPS)
                                │
                     Cloud Load Balancer + SSL
                        │               │
                 Cloud Run           Cloud Run
                (frontend Next.js)  (backend API Node.js)
                        │               │
                        │        ┌──────┴──────┐
                        │    Cloud SQL     Secret Manager
                        │   (PostgreSQL)   (credenciales)
                        │
                 Cloud Storage + Cloud CDN
                  (imágenes de producto)
```

- El **frontend** llama al **backend** por su URL interna (o pública, según se configure) — nunca el frontend accede directamente a Cloud SQL.
- El **backend** es el único servicio con credenciales de base de datos, obtenidas de Secret Manager en tiempo de ejecución, nunca en el código fuente.

---

## 3. Base de datos: conexión desde Cloud Run a Cloud SQL

- Usar el **Cloud SQL Auth Proxy** (integrado como sidecar en Cloud Run mediante la conexión nativa de Cloud Run a Cloud SQL) — evita exponer la base de datos a IPs públicas directamente.
- Configurar **backups automáticos diarios** desde la consola de Cloud SQL (viene fácil de habilitar, no requiere script propio).
- Empezar con la instancia más pequeña disponible (ej. `db-f1-micro` o equivalente actual) — se puede escalar verticalmente después sin rehacer la arquitectura; no sobredimensionar desde el día uno.
- Entorno separado de base de datos para staging y producción (sección 6) — nunca probar cambios de esquema directamente contra la base de datos real de clientes.

---

## 4. Almacenamiento y entrega de imágenes

1. Bucket de Cloud Storage dedicado (ej. `retail-hogar-product-images`), con estructura de carpetas por producto/variante para mantener orden.
2. El backend (o el panel admin al subir una imagen) escribe al bucket y guarda solo la **URL** en la tabla `product_images` definida en `retail-catalog-data-model` — el archivo en sí nunca vive en la base de datos.
3. Cloud CDN configurado delante del bucket para que las imágenes se sirvan rápido y cerca del usuario, sin sobrecargar el backend en cada carga de página.
4. Permisos del bucket: solo lectura pública para las imágenes ya publicadas; escritura restringida al backend autenticado — nunca un bucket completamente abierto a escritura pública.

---

## 5. CI/CD — automatizar el despliegue

| Opción | Cuándo conviene |
|---|---|
| **GitHub Actions** | Si el código vive en GitHub (recomendado por defecto) — se integra naturalmente con el flujo de pull requests y es más simple de aprender si es la primera vez que se configura CI/CD |
| **Cloud Build** | Si se prefiere mantener todo dentro del ecosistema de Google sin depender de GitHub Actions, o si se usa Cloud Source Repositories |

**Recomendación por defecto:** GitHub Actions, con un flujo simple:
1. Push a rama `main` → ejecuta tests (si existen, ver `retail-frontend-react-components` sección de testing) → construye imagen de contenedor → despliega a Cloud Run de **staging**.
2. Aprobación manual o merge a una rama `production` → despliega a Cloud Run de **producción**.

Esto evita que un cambio llegue directo a producción sin pasar por staging, incluso en un proyecto pequeño — el costo de configurarlo una vez es bajo comparado con el riesgo de un despliegue roto en el sitio transaccional real.

---

## 6. Entornos: staging vs. producción

- Dos entornos separados desde el inicio, no solo uno:
  - **Staging:** para probar antes de que el cliente final vea el cambio — base de datos propia (con datos de prueba, nunca copia de datos reales de clientes/pagos), credenciales de pasarela de pago en **modo sandbox/pruebas** (todas las pasarelas listadas en `retail-payments-integration` ofrecen un modo de prueba).
  - **Producción:** base de datos real, credenciales de pasarela en modo live.
- Cada entorno tiene su propio conjunto de variables de entorno/secretos en Secret Manager — nunca compartir credenciales de producción en staging.
- Recomendación práctica para quien despliega por primera vez: **hacer funcionar todo el flujo de compra completo en staging con la pasarela en modo sandbox antes de activar el modo live** — así se valida el flujo de pago sin riesgo de cobros reales fallidos.

---

## 7. Variables de entorno y secretos

- Nunca commitear archivos `.env` con valores reales al repositorio — solo un `.env.example` con los nombres de variable sin valores.
- Variables de entorno no sensibles (ej. `NODE_ENV`, URLs públicas) se configuran directamente en Cloud Run.
- Valores sensibles (contraseña de base de datos, llaves de la pasarela de pago, JWT secret) se guardan en **Secret Manager** y se inyectan a Cloud Run como variables de entorno en tiempo de despliegue, referenciando el secreto, no copiando su valor.
- Rotación de secretos: si una llave de API se expone accidentalmente (ej. commit por error), rotarla inmediatamente desde el proveedor correspondiente y actualizar Secret Manager — no esperar a que sea explotada.

---

## 8. Dominio y HTTPS

1. Comprar/apuntar el dominio del negocio hacia Google Cloud (registros DNS tipo A/CNAME según el servicio elegido).
2. Certificado SSL **administrado por Google** (se renueva automáticamente) — no gestionar certificados manualmente.
3. Redirección forzada de HTTP a HTTPS en todas las rutas — no negociable para un sitio que procesa pagos.
4. Si se usa Cloud Run directamente, mapear el dominio personalizado desde la consola de Cloud Run (soporta dominios propios sin necesidad de Load Balancer para casos simples; el Load Balancer se justifica si se necesita enrutar frontend y backend bajo el mismo dominio con distintas rutas, ej. `/api/*`).

---

## 9. Monitoreo y logging

- Logs estructurados del backend (ver `retail-backend-api-admin`, sección de logging) fluyen automáticamente a **Cloud Logging** al correr en Cloud Run — no requiere configuración adicional compleja.
- Configurar al menos una **alerta básica** en Cloud Monitoring desde el día uno: tasa de errores 5xx elevada en el backend, y caída de disponibilidad del servicio — para enterarse de un problema antes que el cliente.
- Revisar el dashboard de Cloud Run (uso de CPU/memoria, latencia, tasa de errores) periódicamente, especialmente tras cada despliegue nuevo.

---

## 10. Costos — consideraciones para empezar

- Cloud Run cobra por uso real (escala a cero), lo que mantiene el costo bajo mientras el tráfico es pequeño — evitar sobre-aprovisionar instancias mínimas altas "por si acaso".
- Cloud SQL tiene costo fijo aunque no haya tráfico (a diferencia de Cloud Run) — es el componente a vigilar más de cerca en el presupuesto inicial; usar la instancia más pequeña viable para empezar (sección 3).
- Configurar alertas de presupuesto en Google Cloud Billing desde el inicio, para no llevarse sorpresas mientras se aprende la plataforma.

---

## 11. Qué NO cubre esta skill

- El código de la aplicación en sí (React, Node.js) → `retail-frontend-react-components` y `retail-backend-api-admin`.
- El esquema de la base de datos (esta skill la aloja, no la diseña) → `retail-catalog-data-model`.
- Configuración específica de la pasarela de pago (esta skill provee dónde guardar sus credenciales, no la integración en sí) → `retail-payments-integration`.
- Optimización de rendimiento del sitio (Core Web Vitals, SEO) más allá de la infraestructura que la sostiene → `retail-seo-performance`.
