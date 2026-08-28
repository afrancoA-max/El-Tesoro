---
name: retail-seo-performance
description: Optimización técnica transversal de SEO y rendimiento para la tienda de hogar — metadatos, datos estructurados de producto, sitemap, Core Web Vitals, optimización de imágenes, accesibilidad técnica, y configuración de Search Console/Analytics/Merchant Center. Úsala SIEMPRE que se trabaje en metadatos de página, datos estructurados (Schema.org), velocidad de carga, optimización de imágenes más allá de su presentación visual, auditorías de Lighthouse/PageSpeed, o exposición del catálogo a Google Shopping. Aplica de forma continua sobre el trabajo de las demás skills, no como fase única al final — no la uses para el diseño visual en sí (usa retail-ux-design-system) ni para la implementación de componentes React (usa retail-frontend-react-components, que ejecuta lo que esta skill exige como objetivo/target).
---

# Retail Hogar E-commerce — SEO Técnico y Rendimiento

Esta skill define los objetivos y reglas técnicas de SEO y performance que **todas las demás skills deben cumplir al construir**, no una fase que se aplica solo al final. Un catálogo con múltiples categorías depende fuertemente de SEO orgánico para adquisición de tráfico — descuidarlo desde el inicio es costoso de corregir después.

---

## 1. Metadatos por tipo de página

| Página | Title | Meta description | Notas |
|---|---|---|---|
| Home | Nombre de marca + propuesta de valor breve | Resumen de categorías principales | Único, no genérico |
| Categoría | `{Categoría} \| {Marca}` (ej. "Sartenes \| Tienda Hogar") | Descripción de la categoría, menciona subcategorías destacadas | **Cada categoría necesita texto único** — no copiar la misma plantilla sin variación, Google penaliza contenido duplicado |
| Producto | `{Nombre del producto} \| {Marca}` | Descripción corta del producto (reutilizar `descripcion_corta` de `retail-catalog-data-model`, no duplicarla exactamente en cientos de productos sin personalización) | Incluir atributos clave si caben (material, tamaño) |
| Búsqueda/filtros | Debe llevar `noindex` si genera URLs con combinaciones infinitas de filtros | Evita que Google indexe miles de variantes de URL sin valor único |

Todo esto se implementa en `retail-frontend-react-components` (metadata dinámica por ruta en Next.js), pero **esta skill define el contenido y la regla**, no el código.

---

## 2. URLs y estructura

- Slugs descriptivos y estables (definidos en `retail-catalog-data-model`): `/categoria/sartenes`, `/producto/sarten-antiadherente-chef-24cm` — nunca IDs numéricos sueltos en la URL pública.
- **Canonical URL** en cada página, especialmente en páginas de listado con parámetros de filtro/orden (`?orden=precio_asc`) apuntando a la versión sin parámetros — evita contenido duplicado indexado.
- Breadcrumbs visibles (ya definidos visualmente en `retail-ux-design-system`) implementados también como datos estructurados (sección 3) — ayuda tanto a UX como a que Google entienda la jerarquía del sitio.
- Redirecciones 301 obligatorias si un slug de producto/categoría cambia — nunca dejar un enlace roto (404) para una URL que antes existía y pudo haber sido indexada o compartida.

---

## 3. Datos estructurados (Schema.org)

Necesarios para que Google muestre resultados enriquecidos (precio, disponibilidad, rating) y para habilitar Google Shopping/Merchant Center:

- **`Product`** en cada página de producto: nombre, imagen, descripción, SKU, marca, precio, disponibilidad (`InStock`/`OutOfStock`, sincronizado con el inventario real de `retail-catalog-data-model` — nunca un dato estructurado desactualizado respecto al stock real).
- **`BreadcrumbList`** en páginas de categoría y producto.
- **`Organization`** en el layout general (nombre del negocio, logo, redes sociales) — una sola vez, no repetido por página.
- **`AggregateRating`/`Review`** si el proyecto implementa reseñas de producto (evaluar alcance con el usuario — si no hay reseñas aún, omitir este dato en vez de falsearlo).

Implementación técnica (JSON-LD embebido) vive en `retail-frontend-react-components`; esta skill define qué campos son obligatorios y de dónde deben obtenerse (siempre de la fuente de verdad del catálogo/inventario, nunca hardcoded).

---

## 4. Sitemap y robots.txt

- `sitemap.xml` generado dinámicamente (no manual) a partir del catálogo real — se actualiza automáticamente cuando se agregan/desactivan productos o categorías en `retail-backend-api-admin`.
- Incluir solo páginas indexables (categorías activas, productos activos) — excluir productos `borrador`/`descontinuado` (estado definido en `retail-catalog-data-model`).
- `robots.txt` permite el rastreo del catálogo público, bloquea explícitamente `/admin`, `/checkout`, `/carrito`, `/cuenta` (páginas sin valor de indexación y que no deben aparecer en resultados de búsqueda).
- Enviar el sitemap a **Google Search Console** una vez desplegado (configuración manual inicial, ver sección 8).

---

## 5. Core Web Vitals — objetivos concretos

| Métrica | Qué mide | Objetivo |
|---|---|---|
| **LCP** (Largest Contentful Paint) | Tiempo hasta que el contenido principal es visible | < 2.5s |
| **INP** (Interaction to Next Paint) | Capacidad de respuesta a interacciones del usuario | < 200ms |
| **CLS** (Cumulative Layout Shift) | Estabilidad visual (que el layout no "salte" mientras carga) | < 0.1 |

Reglas concretas para cumplirlos en este proyecto:
- **LCP:** la imagen principal de producto/hero de home debe precargarse (`priority`/`preload`) y servirse ya optimizada (sección 6) — es casi siempre el elemento que determina el LCP en un e-commerce.
- **INP:** evitar JavaScript bloqueante en la carga inicial; interacciones críticas (agregar al carrito, abrir filtros) no deben esperar a que cargue contenido no esencial (chat de soporte, scripts de analítica de terceros deben cargar de forma diferida, ver sección 8).
- **CLS:** todo elemento de imagen debe reservar su espacio (`width`/`height` o `aspect-ratio` definidos) antes de cargar — nunca dejar que una imagen de producto "empuje" el layout al terminar de cargar. Mismo criterio para banners rotativos del home.

Estos objetivos son la especificación que `retail-frontend-react-components` debe cumplir en su implementación; esta skill los audita, no los codifica.

---

## 6. Optimización de imágenes

- Formatos modernos (WebP/AVIF) con fallback automático — ya cubierto técnicamente por `next/image` en `retail-frontend-react-components`, pero el criterio de calidad se define aquí: comprimir sin degradar visiblemente el detalle del producto (relevante para venta de ollas/cristalería donde el acabado importa).
- Tamaños responsivos (`srcset`) — nunca servir una imagen de 2000px a un dispositivo móvil que solo la muestra a 400px.
- Imágenes decorativas (no de producto) deben poder marcarse como tales (`alt=""`) para no confundir a lectores de pantalla; imágenes de producto llevan `alt` descriptivo real (ver también accesibilidad, sección 7).

---

## 7. Accesibilidad técnica (complementa lo visual ya definido)

`retail-ux-design-system` define contraste y áreas táctiles; esta skill añade lo técnico/estructural:
- HTML semántico real (`<nav>`, `<main>`, `<article>` para producto, encabezados en orden jerárquico sin saltos de H1 a H3) — no solo `<div>` con estilos, que perjudica tanto accesibilidad como SEO.
- Un único `<h1>` por página (nombre de categoría o de producto), no repetido en el logo o en otros elementos.
- Formularios (checkout, cuenta) con `<label>` asociado correctamente a cada campo, no solo placeholder como única pista.
- Verificación periódica con herramientas automatizadas (Lighthouse, axe) como mínimo, no como sustituto de revisión real pero sí como red de seguridad continua.

---

## 8. Analítica, Search Console y Merchant Center

- **Google Search Console:** verificar el dominio, enviar el sitemap, monitorear errores de indexación y Core Web Vitals reportados por Google (dato real de usuarios, complementa las pruebas de Lighthouse que son sintéticas/de laboratorio).
- **Google Analytics 4 (o alternativa que el usuario prefiera):** eventos mínimos de e-commerce a trackear: vista de producto, agregar al carrito, inicio de checkout, compra completada — necesarios para medir conversión real del sitio, no solo tráfico.
- **Google Merchant Center:** si el negocio quiere aparecer en Google Shopping, requiere un feed de productos (puede generarse desde los mismos datos estructurados `Product` de la sección 3, o como feed XML/CSV separado) — evaluar alcance con el usuario, no es indispensable para el lanzamiento inicial pero sí para escalar adquisición.
- Todos los scripts de terceros (analítica, píxeles de publicidad) se cargan de forma diferida (`async`/`defer` o carga tras interacción) para no penalizar INP/LCP (sección 5).

---

## 9. Auditoría continua

- Ejecutar Lighthouse (o PageSpeed Insights) en las páginas más visitadas (home, una categoría representativa, un producto representativo) **antes de cada despliegue mayor a producción**, no solo una vez al inicio del proyecto.
- Revisar Search Console mensualmente una vez el sitio esté indexado: errores de rastreo, páginas no indexadas, caída de Core Web Vitals reales.
- Cualquier regresión de performance introducida por una nueva funcionalidad (ej. un widget de recomendaciones que añade peso significativo) debe evaluarse contra los objetivos de la sección 5 antes de aceptarse, no después de notar que el sitio se siente más lento.

---

## 10. Qué NO cubre esta skill

- Paleta de colores, tipografía y patrones visuales → `retail-ux-design-system`.
- Implementación de componentes React, metadata dinámica en código, `next/image` → `retail-frontend-react-components` (ejecuta lo que esta skill exige).
- Estructura de datos de categorías/productos (esta skill consume esos datos para metadatos/sitemap, no los define) → `retail-catalog-data-model`.
- Infraestructura de hosting/CDN en sí (esta skill se beneficia de ella pero no la configura) → `retail-gcp-deployment-devops`.
