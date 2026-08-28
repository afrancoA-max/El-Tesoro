# Módulo 02 — API de catálogo, datos semilla y staging

## 1. Nombre y objetivo

**API de catálogo + staging.** Exponer el catálogo por API REST con datos reales de prueba, y activar el entorno de staging en GCP para que todo módulo posterior se valide desplegado, no solo en local.

## 2. Alcance funcional

**Incluye:**

- Endpoints públicos de solo lectura: listar categorías (árbol completo), listar productos por categoría con paginación, filtros (precio, material, marca, disponibilidad) y ordenamiento, detalle de producto con variantes/imágenes/relacionados, búsqueda básica por texto, y colecciones destacadas.
- Importador de datos semilla: script que carga productos desde CSV/hoja de cálculo (nombre, categoría, variantes, precios, stock, URLs de imagen) — esta es la vía oficial de carga de catálogo hasta que exista el panel admin (módulo 08). Cargar un set realista: mínimo 40 productos reales distribuidos en todas las categorías.
- Almacenamiento de imágenes de producto en Cloud Storage con URLs servibles.
- Manejo de errores centralizado, formato de respuesta JSON consistente y códigos HTTP correctos (según convenciones de la skill de backend).
- **Staging en GCP:** backend y base de datos desplegados (Cloud Run + Cloud SQL o equivalente según decisión del módulo 01), secretos en Secret Manager, despliegue automatizado desde la rama principal. Desde aquí, el checklist de cada módulo se verifica en staging.

**Queda fuera:** endpoints de escritura/admin (módulo 08), autenticación (módulo 04), carrito y órdenes (05–06), frontend (03), dominio propio y producción (09).

## 3. Dependencias

- **01 Fundacional** — necesita el modelo de datos migrado, la taxonomía cargada y el esqueleto del monorepo.

## 4. Skills involucradas

- `retail-backend-api-admin` — decisión de framework Node (sección 1), estructura de carpetas (2), endpoints públicos (4), manejo de errores y respuestas (7), validación y seguridad (8), logging (9).
- `retail-catalog-data-model` — consultas sobre el modelo ya creado; convenciones de datos para el importador CSV.
- `retail-gcp-deployment-devops` — mapa de servicios (1), arquitectura de despliegue (2), conexión Cloud Run ↔ Cloud SQL (3), almacenamiento de imágenes (4), CI/CD (5), entorno staging (6), secretos (7).
- `retail-hogar-ecommerce-master` — frontera entre skills y convenciones de API.

## 5. Listo cuando…

- [ ] Una colección de requests (Postman/Bruno/`.http`) cubre todos los endpoints públicos y todos responden correctamente **contra staging**, no solo local.
- [ ] `GET` de productos por categoría pagina, filtra por al menos precio + un atributo (ej. material) y ordena por precio y novedad, verificable cambiando parámetros en la URL.
- [ ] La búsqueda de texto encuentra "sartén" aunque el usuario escriba "sarten" (sin tilde).
- [ ] El importador carga el CSV de 40+ productos en una corrida, es re-ejecutable sin duplicar datos, y reporta filas rechazadas con motivo.
- [ ] Las imágenes de producto se sirven desde Cloud Storage con URL pública y tiempo de respuesta < 1 s desde Guatemala.
- [ ] Un endpoint inexistente o un parámetro inválido devuelven error JSON con formato estándar y código HTTP correcto (404/400), no un stack trace.
- [ ] Un push a la rama principal despliega staging automáticamente sin pasos manuales.

## 6. Riesgos y decisiones pendientes

- **Framework Node.js:** Express (simple, más documentación), Fastify (rendimiento) o NestJS (estructura fuerte). Claude Code debe proponer uno con justificación y confirmar antes de escribir la primera ruta.
- **Presupuesto GCP de staging:** confirmar con el dueño un tope mensual aceptable (staging puede configurarse para escalar a cero y costar casi nada, pero Cloud SQL tiene costo base; la skill de GCP sección 10 cubre alternativas).
- **Origen del catálogo real:** ¿existe ya un listado de productos con fotos y precios (Excel, sistema actual)? El formato del CSV importador debe diseñarse sobre ese archivo real, no sobre uno inventado. Pedirlo antes de construir el importador.
- **Fotografía de producto:** si no hay fotos profesionales aún, es un riesgo de cronograma para el módulo 03 (el impacto visual exigido depende de ellas). Señalarlo temprano.
