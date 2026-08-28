---
name: retail-frontend-react-components
description: Implementación técnica del frontend en React para la tienda de hogar — arquitectura de componentes, enrutamiento, manejo de estado, consumo de la API del backend, patrones de carga/error/vacío, y optimización de rendimiento en el cliente. Úsala SIEMPRE que se escriba o modifique código React/JSX, se cree una página o componente nuevo, se conecte el frontend a un endpoint, se maneje estado del cliente (carrito visible, filtros, sesión de usuario), o se optimice el rendimiento del navegador (lazy loading, code splitting, memoización). No la uses para decidir colores/tipografía/patrones visuales (usa retail-ux-design-system, esta skill los CONSUME, no los define), para el esquema de datos (usa retail-catalog-data-model), ni para la lógica de negocio del carrito/checkout/pagos en el servidor (usa retail-cart-checkout y retail-payments-integration) — esta skill solo traduce esas decisiones a código de cliente funcionando correctamente.
---

# Retail Hogar E-commerce — Frontend en React

Esta skill implementa en código React lo que `retail-ux-design-system` define visualmente y lo que `retail-catalog-data-model` / `retail-backend-api-admin` exponen como datos. No toma decisiones de diseño ni de negocio por sí misma — las traduce a componentes funcionando, performantes y mantenibles.

---

## 1. Decisión de framework (confirmar con el usuario si no está fijada)

| Criterio | React + Vite (SPA pura) | Next.js (SSR/SSG) |
|---|---|---|
| SEO de páginas de producto/categoría | Requiere trabajo extra (pre-render, meta tags dinámicos vía librería) | Nativo (SSR o SSG por página) — importante para un catálogo que debe indexarse bien en Google |
| Velocidad de carga inicial | Depende de code splitting manual | Mejor por defecto (SSR entrega HTML ya renderizado) |
| Complejidad de despliegue en GCP | Más simple (archivos estáticos + API separada) | Requiere entorno Node corriendo (Cloud Run es buen fit) |
| Curva de desarrollo | Más simple/directa | Requiere entender rutas de servidor, `getServerSideProps`/`generateStaticParams`, etc. |

**Recomendación por defecto:** Next.js, porque el negocio exige SEO fuerte para el catálogo (ver `retail-seo-performance`) y páginas de producto que deben indexarse individualmente — algo que una SPA pura resuelve con más esfuerzo. Si el usuario prioriza simplicidad sobre SEO nativo (ej. sitio con tráfico mayormente pagado/directo), Vite + React Router es alternativa válida. **Esta skill asume Next.js (App Router) en las convenciones siguientes; si se confirma SPA pura, la sección 8 da las pautas de adaptación.**

---

## 2. Estructura de carpetas del frontend

Dentro de `frontend/src/` (definida en la skill maestra):

```
src/
├── app/                        # Rutas (Next.js App Router)
│   ├── page.tsx                 # Home
│   ├── categoria/[slug]/page.tsx
│   ├── producto/[slug]/page.tsx
│   ├── carrito/page.tsx
│   ├── checkout/page.tsx
│   ├── cuenta/...
│   └── layout.tsx
├── components/
│   ├── ui/                      # Elementos base: Button, Badge, Input, Skeleton (mapean 1:1 a design tokens)
│   ├── layout/                  # Header, Footer, MegaMenu, MobileNav
│   ├── product/                 # ProductCard, ProductGallery, VariantSelector
│   ├── catalog/                 # FilterPanel, SortDropdown, CategoryGrid
│   └── cart/                    # CartDrawer, CartItem, CheckoutSteps
├── hooks/                       # useCart, useProduct, useCategory, useDebounce
├── services/                    # api.ts (cliente HTTP), productsService, cartService
├── context/ (o store/ si se usa Zustand) # CartContext, UserContext
├── lib/                         # utilidades: formatCurrency, slugify, validators
└── styles/                      # tokens compartidos con retail-ux-design-system (variables CSS)
```

Regla: ningún componente de `components/product`, `components/catalog` o `components/cart` contiene valores visuales hardcoded — todos consumen los tokens definidos en `retail-ux-design-system`.

---

## 3. Manejo de estado

Distinguir tres tipos de estado y no mezclarlos:

| Tipo de estado | Ejemplo | Herramienta recomendada |
|---|---|---|
| Estado de servidor (datos remotos) | Lista de productos, detalle de producto, stock | React Query / TanStack Query (o SWR) — nunca `useState` + `useEffect` manual para fetching |
| Estado global de cliente | Carrito visible, usuario autenticado, filtros activos | Context API si es simple; Zustand si crece en complejidad — decidir con el usuario y mantener consistente en todo el proyecto |
| Estado local de componente | Input de formulario, acordeón abierto/cerrado | `useState` local, sin elevarlo innecesariamente |

**Regla del carrito:** el contenido del carrito vive en estado global de cliente (Context/Zustand) sincronizado con el backend (`retail-cart-checkout`) — nunca solo en estado local de un componente, porque debe persistir entre páginas y sobrevivir un refresh (usar `localStorage` o cookie de sesión como respaldo, confirmando el mecanismo con `retail-cart-checkout`).

---

## 4. Consumo de API

- Cliente HTTP centralizado en `services/api.ts` (instancia única con base URL desde variable de entorno, manejo centralizado de errores y headers de autenticación).
- Un archivo de servicio por dominio (`productsService.ts`, `cartService.ts`, `ordersService.ts`) que expone funciones tipadas — ningún componente hace `fetch` directo.
- Todo hook de datos (`useProduct`, `useCategoryProducts`) usa React Query con:
  - `staleTime` razonable para catálogo (no refetch agresivo de datos que cambian poco).
  - Invalidación explícita tras mutaciones (ej. tras agregar al carrito, invalidar query de carrito).
- Manejo de errores de red consistente: componente `ErrorState` reutilizable (definido visualmente en `retail-ux-design-system`), nunca un `console.error` silencioso sin feedback al usuario.

---

## 5. Rutas principales del sitio

| Ruta | Componente/página | Datos que consume |
|---|---|---|
| `/` | Home | Categorías destacadas, productos destacados |
| `/categoria/[slug]` | Listado de categoría | Productos filtrados/paginados, filtros disponibles |
| `/producto/[slug]` | Detalle de producto | Producto + variantes + relacionados |
| `/buscar?q=` | Resultados de búsqueda | Resultado de búsqueda de texto |
| `/carrito` | Carrito completo | Estado global de carrito |
| `/checkout` | Checkout paso a paso | Estado de carrito + flujo de `retail-cart-checkout` |
| `/cuenta/pedidos` | Historial de pedidos | Órdenes del usuario autenticado |
| `/404` y `/500` | Estados de error | — |

---

## 6. Estados de carga, error y vacío (obligatorios en toda vista de datos)

Ningún componente que consuma datos remotos se entrega sin sus tres estados:
1. **Loading:** Skeleton loader que imita la forma final del contenido (definido visualmente en `retail-ux-design-system`) — no spinners genéricos para listados de producto.
2. **Error:** mensaje claro + acción de reintentar, nunca una pantalla en blanco o error técnico crudo visible al usuario.
3. **Vacío:** ej. carrito vacío, resultados de filtro sin coincidencias, historial de pedidos sin órdenes — mensaje contextual con siguiente acción sugerida.

---

## 7. Rendimiento en el cliente

- **Imágenes:** usar `next/image` (o equivalente) para todas las imágenes de producto — redimensionado automático, lazy loading nativo, formatos modernos (WebP/AVIF).
- **Code splitting:** rutas se dividen automáticamente por Next.js; componentes pesados no críticos para el primer render (ej. modal de zoom de imagen, chat de soporte) se cargan con `dynamic import`.
- **Memoización selectiva:** `useMemo`/`useCallback` solo donde hay costo real medido (listas grandes, cálculos de filtrado) — no aplicar por defecto en todo componente, evita complejidad innecesaria.
- **Virtualización:** si una categoría puede tener cientos de productos visibles simultáneamente, considerar `react-window` o similar en el grid — evaluar según volumen real de catálogo.
- Presupuesto de rendimiento y métricas específicas (Core Web Vitals) se definen y auditan en `retail-seo-performance`; esta skill es responsable de no violarlos al implementar.

---

## 8. Adaptación si el proyecto usa React + Vite (SPA) en lugar de Next.js

Si se confirma SPA pura:
- Enrutamiento con `react-router-dom` en lugar de App Router; estructura de `app/` se reemplaza por `pages/` con componentes de ruta y `<Routes>` centralizado.
- SEO de páginas individuales requiere una librería de meta tags dinámicos (ej. `react-helmet-async`) y, si el SEO de catálogo es crítico, evaluar pre-renderizado estático adicional (ej. `vite-plugin-ssr` o generación de sitemap/prerender en build) — coordinar con `retail-seo-performance`.
- El resto de la arquitectura (estado, servicios, componentes, rendimiento) se mantiene igual.

---

## 9. Formularios y validación

- Librería recomendada: React Hook Form + Zod (o Yup) para validación — usar en checkout, cuenta, formularios de contacto.
- Validación en cliente siempre espejada por validación en servidor (`retail-backend-api-admin`, `retail-cart-checkout`) — nunca confiar solo en la validación de cliente para datos sensibles o de negocio.
- Mensajes de error de formulario en español, claros y específicos por campo (no un mensaje genérico único).

---

## 10. Testing (nivel mínimo recomendado)

- Componentes de UI puros (`components/ui`): tests unitarios de renderizado y props con React Testing Library.
- Hooks de datos críticos (`useCart`, `useCheckout`): tests con mocks de la API.
- No se exige cobertura exhaustiva de inicio, pero todo componente transaccional (carrito, checkout) debe tener al menos un test de camino feliz antes de considerarse listo para producción.

---

## 11. Qué NO cubre esta skill

- Paleta de colores, tipografía, espaciados y patrones visuales → `retail-ux-design-system` (esta skill los consume vía tokens, no los redefine).
- Estructura de base de datos y modelo de producto/variante → `retail-catalog-data-model`.
- Endpoints, autenticación de servidor, lógica de negocio del backend → `retail-backend-api-admin`.
- Reglas de negocio de reserva de stock, cálculo de envío/impuestos → `retail-cart-checkout`.
- Integración real con la pasarela de pago → `retail-payments-integration` (el frontend solo implementa el formulario/UI que esa skill especifique).
