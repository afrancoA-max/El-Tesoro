---
name: retail-ux-design-system
description: Sistema de diseño visual y patrones de experiencia/navegación para la tienda de productos de hogar (ollas, sartenes, electrodomésticos pequeños, cristalería). Úsala SIEMPRE que se trabaje en apariencia visual, paleta de colores, tipografía, espaciados, componentes de interfaz (botones, tarjetas de producto, menús, filtros, banners), navegación por categorías/subcategorías, diseño responsivo/mobile, estados de interacción (hover, focus, loading, vacío), o cuando el usuario pida que algo se vea "más profesional", "más moderno", "más ordenado" o "más fácil de navegar". No la uses para decidir la estructura de datos del catálogo (usa retail-catalog-data-model) ni para el código de implementación en React (usa retail-frontend-react-components) — esta skill define el QUÉ visual y de interacción, no el CÓMO se codifica ni CÓMO se estructuran los datos.
---

# Retail Hogar E-commerce — Sistema de Diseño y Navegación

Esta skill define el lenguaje visual y los patrones de experiencia de usuario del sitio. Es la referencia obligatoria antes de crear o modificar cualquier componente visual. No decide estructura de datos (`retail-catalog-data-model`) ni implementación técnica en React (`retail-frontend-react-components`) — ambas deben consultar esta skill para sus decisiones visuales, no redefinirlas.

**Objetivo del negocio que este sistema debe cumplir:** transmitir calidad y confianza en productos físicos (materiales, acabados, tamaños) que se venden principalmente por la imagen, con navegación clara entre múltiples categorías, en un sitio que se sienta moderno y de alto impacto — no una plantilla genérica de e-commerce.

---

## 1. Dirección de identidad visual

Para productos de cocina/hogar, evitar dos extremos: (a) verse como ferretería fría y genérica, (b) verse como blog de recetas sin seriedad transaccional. La dirección recomendada:

- **Tono:** cálido pero profesional — transmite "cocina real, calidad confiable", no "catálogo industrial".
- **Fondo predominante:** blancos y neutros cálidos (no blanco puro frío) para que el producto (ollas de acero, cristalería, colores de electrodomésticos) resalte y sea el protagonista visual.
- **Acento de marca:** un color de acento saturado (a definir con el usuario — ej. terracota, verde oliva, mostaza, o el color corporativo si ya existe) usado con moderación: CTAs, precios, badges, no como fondo masivo.
- **Fotografía de producto:** fondo limpio y consistente (blanco o neutro) en miniaturas de catálogo; se permite fotografía de ambiente (producto en uso, en cocina real) en banners y páginas de categoría para dar contexto aspiracional.

Si el usuario ya tiene una identidad de marca (logo, colores corporativos), esta sección se ajusta a esa marca; si no, la primera tarea de esta skill es proponer 2–3 opciones de paleta y confirmar con el usuario antes de aplicarlas al resto del sitio.

---

## 2. Design tokens (fuente única de verdad)

Definir como variables (CSS custom properties o archivo de tokens) para que toda skill de implementación las consuma sin reinventarlas:

```css
:root {
  /* Color — valores de ejemplo, ajustar tras definir paleta de marca */
  --color-bg: #FAF8F5;
  --color-bg-alt: #F0EBE3;
  --color-surface: #FFFFFF;
  --color-text-primary: #2B2622;
  --color-text-secondary: #6B6259;
  --color-accent: #C1622D;       /* color de marca — CTAs, precios, badges */
  --color-accent-hover: #A44F22;
  --color-success: #4C7A4C;      /* confirmaciones, stock disponible */
  --color-danger: #B3261E;       /* errores, "sin stock" */
  --color-border: #E4DED5;

  /* Tipografía */
  --font-heading: 'Poppins', sans-serif;   /* o la que se confirme con el usuario */
  --font-body: 'Inter', sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.75rem;
  --font-size-2xl: 2.5rem;

  /* Espaciado — escala de 4px */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;

  /* Bordes y sombras */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --shadow-card: 0 2px 8px rgba(0,0,0,0.06);
  --shadow-card-hover: 0 8px 24px rgba(0,0,0,0.10);
}
```

**Regla:** ningún componente nuevo (de esta skill o de `retail-frontend-react-components`) usa valores de color, tipografía o espaciado "sueltos" (hardcoded) — siempre referencia estos tokens.

---

## 3. Tipografía

- **Encabezados (`--font-heading`):** una fuente con carácter pero legible (ej. Poppins, Fraunces, o similar) — da personalidad de marca sin sacrificar claridad.
- **Cuerpo de texto (`--font-body`):** fuente sans-serif neutra de alta legibilidad (ej. Inter, Work Sans) para descripciones de producto, precios, formularios.
- **Jerarquía mínima requerida:** H1 (nombre de página/categoría), H2 (secciones), H3 (nombre de producto en tarjeta), body, caption (metadatos como SKU, disponibilidad).
- **Nunca** más de 2 familias tipográficas en el sitio.

---

## 4. Componentes de interfaz (catálogo de patrones)

Cada componente debe definirse en sus estados: default, hover, focus, active, disabled, loading, error/vacío.

### 4.1 Tarjeta de producto (`ProductCard`)
Elemento más repetido del sitio — debe ser impecable.
- Imagen cuadrada o 4:5 con fondo consistente, con zoom sutil en hover (desktop).
- Nombre del producto (truncado a 2 líneas máx.), categoría/subcategoría como texto secundario.
- Precio destacado con `--color-accent`; si hay descuento, precio anterior tachado + badge de % de descuento.
- Indicador de variantes disponibles si aplica (ej. swatches de color/tamaño) sin necesidad de entrar al producto.
- Badge opcional: "Nuevo", "Más vendido", "Últimas unidades".
- Botón de acción rápida ("Agregar al carrito" o "Ver producto") visible permanentemente en mobile, revelado en hover en desktop.
- Estado sin stock: imagen atenuada + badge "Agotado", botón deshabilitado.

### 4.2 Navegación principal
- Header sticky (se mantiene visible al hacer scroll) con: logo, buscador prominente, ícono de carrito con contador, acceso a cuenta.
- **Mega menú** para categorías principales (ollas, sartenes, electrodomésticos, cristalería, etc.) desplegado en hover/click desde desktop, mostrando subcategorías agrupadas y opcionalmente una imagen destacada por categoría.
- En mobile: menú hamburguesa con acordeón de categorías/subcategorías, buscador accesible desde el primer tap.
- Breadcrumbs en todas las páginas internas (Home > Cocina > Ollas > Ollas de acero inoxidable) — crítico para sitios con muchas categorías.

### 4.3 Listado/grid de categoría
- Grid responsivo: 2 columnas en mobile, 3–4 en tablet, 4–5 en desktop.
- Panel de filtros lateral en desktop (colapsable), modal o drawer inferior en mobile.
- Filtros mínimos requeridos para este nicho: subcategoría, rango de precio, material, marca, capacidad/tamaño, disponibilidad.
- Ordenamiento: relevancia, precio (asc/desc), más vendidos, novedades.
- Paginación o scroll infinito (definir con el usuario) + indicador de "mostrando X de Y productos".
- Estado vacío (sin resultados de filtro): ilustración/mensaje amigable + sugerencia de quitar filtros.

### 4.4 Página de producto
- Galería de imágenes con miniaturas, zoom al hacer hover/tap, soporte para múltiples ángulos.
- Selector de variantes (tamaño, color, material) claramente visible, no oculto en dropdown si son pocas opciones (usar swatches/botones).
- Información de disponibilidad de stock en tiempo real.
- Bloque de especificaciones técnicas (capacidad, material, dimensiones, apto para inducción, etc.) — relevante para electrodomésticos y ollas.
- Sección de productos relacionados/complementarios ("Compra junto a esto") — ej. sartén + espátula de la misma línea.
- CTA de "Agregar al carrito" siempre visible (sticky en mobile al hacer scroll).

### 4.5 Home page
- Hero principal con banner rotativo o estático (promoción, colección destacada, temporada).
- Bloques de categorías destacadas con imagen representativa (acceso directo visual, no solo texto).
- Carrusel de productos destacados/más vendidos.
- Sección de confianza (envíos, garantía, medios de pago aceptados) — importante para conversión en primera compra.
- Sección editorial opcional (ej. "Arma tu cocina", guías de compra) para dar profundidad de marca sin saturar de producto.

### 4.6 Carrito y checkout (visual únicamente — el flujo funcional vive en `retail-cart-checkout`)
- Carrito lateral (drawer) accesible desde cualquier página, sin recargar.
- Checkout en pasos claros con indicador de progreso (Datos > Envío > Pago > Confirmación).
- Resumen de orden siempre visible/sticky durante el checkout.

---

## 5. Iconografía y elementos gráficos

- Set de íconos consistente en estilo (line icons o filled, no mezclar) — usar una sola librería (ej. Lucide, Phosphor).
- Íconos funcionales mínimos requeridos: búsqueda, carrito, usuario, favoritos/wishlist, filtro, cerrar, flechas de navegación, check de confirmación, advertencia de stock bajo.
- Evitar íconos genéricos de "carrito de supermercado" si no calza con la identidad — considerar íconos más específicos al nicho (olla, sartén) para categorías si el estilo lo permite.

---

## 6. Motion y microinteracciones

Uso moderado — refuerza la sensación de "moderno" sin sacrificar performance:
- Transiciones suaves (150–250ms) en hover de tarjetas, apertura de menús, apertura de carrito lateral.
- Feedback inmediato al agregar producto al carrito (animación breve del ícono de carrito o toast de confirmación).
- Skeleton loaders (no spinners genéricos) mientras cargan imágenes o listados de producto.
- Evitar animaciones largas o decorativas que no aporten funcionalidad — prioridad es performance (ver `retail-seo-performance`).

---

## 7. Accesibilidad y estados

- Contraste mínimo AA (4.5:1 para texto normal) entre `--color-text-primary`/`--color-accent` y sus fondos — verificar especialmente el color de acento sobre blanco.
- Todo elemento interactivo debe tener estado `:focus` visible (no solo `:hover`) para navegación por teclado.
- Textos alternativos descriptivos en imágenes de producto (no solo el nombre del archivo).
- Tamaño mínimo de área táctil en mobile: 44x44px para botones e íconos interactivos.

---

## 8. Breakpoints responsivos (mobile-first)

```css
/* Mobile: 0–639px (default, sin media query) */
/* Tablet */
@media (min-width: 640px)  { /* sm */ }
@media (min-width: 768px)  { /* md */ }
/* Desktop */
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

Todo componente se diseña primero para mobile (la mayoría del tráfico de retail) y se expande hacia desktop, no al revés.

---

## 9. Qué NO cubre esta skill

- Estructura de base de datos de categorías/productos/variantes → `retail-catalog-data-model`.
- Implementación de componentes en código React (JSX, props, estado) → `retail-frontend-react-components`.
- Lógica funcional de carrito, checkout o pagos → `retail-cart-checkout` y `retail-payments-integration`.
- Optimización técnica de imágenes/performance (aunque esta skill define el criterio visual, la implementación de compresión/lazy-loading vive en) → `retail-seo-performance`.

Cuando una tarea requiera tanto la decisión visual como su implementación, esta skill decide el patrón/token a usar y `retail-frontend-react-components` lo traduce a código.
