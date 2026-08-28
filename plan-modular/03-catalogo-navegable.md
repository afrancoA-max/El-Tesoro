# Módulo 03 — Catálogo navegable (frontend público, sin transacción)

## 1. Nombre y objetivo

**Catálogo navegable.** Que cualquier visitante pueda descubrir, explorar y evaluar los productos con una experiencia visual de alto impacto — todo lo necesario para decidir la compra, sin poder comprar todavía.

## 2. Alcance funcional

**Incluye:**

- **Home:** hero de alto impacto, categorías destacadas con imagen, colecciones/novedades, y bloques promocionales gestionables por datos (no hardcodeados).
- **Navegación:** menú principal con mega-menú de categorías/subcategorías (desktop) y menú móvil; breadcrumbs en categoría y producto.
- **Página de categoría:** grid de productos (tarjeta con imagen, nombre, precio, variantes disponibles, estado de stock), filtros por precio y atributos, ordenamiento, paginación o scroll incremental, y estado vacío bien diseñado.
- **Ficha de producto:** galería de imágenes con zoom, selector de variantes que actualiza precio/foto/stock, descripción y especificaciones (material, capacidad, medidas), productos relacionados, e indicador de disponibilidad. El botón "Agregar al carrito" se renderiza deshabilitado con etiqueta "Próximamente" o directamente se omite hasta el módulo 05 — decisión visual a confirmar, pero el espacio del CTA debe existir ya en el layout.
- **Búsqueda** con página de resultados reutilizando el grid.
- Estados de carga (skeletons), error y vacío en toda vista de datos.
- **Compuerta SEO #1** (ver `12-seo-performance.md`): metadatos por página, URLs limpias, datos estructurados de producto, y presupuesto de rendimiento verificado sobre estas páginas.

**Queda fuera:** carrito y todo CTA funcional de compra (05), cuentas (04), cualquier página legal/checkout, y el contenido de marketing definitivo (textos finales pueden llegar después; la estructura debe estar).

## 3. Dependencias

- **01 Fundacional** — sistema de diseño y taxonomía.
- **02 API de catálogo** — todo el contenido se consume de la API en staging; prohibido incrustar datos de producto en el frontend.

## 4. Skills involucradas

- `retail-frontend-react-components` — estructura Next.js (2), manejo de estado (3), consumo de API (4), rutas (5), estados de carga/error/vacío (6), rendimiento en cliente (7).
- `retail-ux-design-system` — componentes de catálogo: ProductCard (4.1), navegación principal (4.2), grid de categoría (4.3), página de producto (4.4), home (4.5), motion (6).
- `retail-seo-performance` — metadatos (1), URLs (2), Schema.org de producto (3), Core Web Vitals (5), optimización de imágenes (6).

## 5. Listo cuando…

- [ ] En staging, un visitante llega de la home a cualquier producto en ≤ 3 clics, en móvil y escritorio.
- [ ] Cambiar variante en la ficha actualiza precio, imagen y disponibilidad sin recargar la página.
- [ ] Filtrar una categoría por precio + material refleja los filtros en la URL (compartible/recargable con el mismo resultado).
- [ ] Con la red simulada en "Fast 3G", las páginas muestran skeletons y no pantallas en blanco; apagar la API muestra estado de error con reintento, no una página rota.
- [ ] Lighthouse (móvil) en home, categoría y producto: Performance ≥ 85, SEO ≥ 95, Accesibilidad ≥ 90.
- [ ] El HTML servido incluye título, meta description y datos estructurados `Product` válidos (verificado con el validador de Schema.org) en fichas de producto.
- [ ] Revisión visual aprobada por el dueño del negocio: la home y 2 categorías se ven "de marca", no de plantilla (única validación subjetiva del proyecto, y se hace aquí a propósito, antes de construir encima).

## 6. Riesgos y decisiones pendientes

- **Contenido visual real:** el criterio de "alto impacto" exige fotos de calidad y textos de marca. Si al iniciar este módulo no hay assets reales, acordar con el dueño si se lanza con fotos de proveedor/banco de imágenes y se reemplazan después.
- **CTA de carrito visible vs. oculto** en esta etapa intermedia: preguntar al dueño si el sitio será visible al público antes del módulo 05 (si staging es privado, es irrelevante; si se comparte, decidir el tratamiento del botón).
- **Alcance de la búsqueda:** fase 1 es búsqueda simple por texto contra la API; búsqueda con autocompletado/sugerencias queda explícitamente fuera y se evalúa post-lanzamiento.
