# Módulo 08 — Panel de administración

## 1. Nombre y objetivo

**Panel admin.** Dar al equipo del negocio el control diario de la tienda — catálogo, inventario, pedidos y reportes — sin tocar la base de datos ni depender de un desarrollador.

## 2. Alcance funcional

**Incluye:**

- Acceso restringido a rol `admin` (rol ya existente desde el módulo 04), con al menos dos niveles si el negocio lo pide (ver punto 6).
- **Catálogo:** CRUD completo de categorías, productos, variantes e imágenes (subida directa a Cloud Storage con reordenamiento), colecciones y productos destacados de la home; activar/desactivar productos. El importador CSV del módulo 02 queda integrado aquí como herramienta de carga masiva.
- **Inventario:** ver y ajustar stock por variante con motivo (recepción, merma, corrección), alerta visual de stock bajo con umbral configurable.
- **Pedidos:** listado con búsqueda y filtros por estado/fecha; detalle completo (cliente, líneas, totales, estado de pago, factura FEL); avance del ciclo de vida operativo `paid → preparing → shipped → delivered` con número de guía del transportista; cancelación con motivo (la lógica de reembolso, si procede, se apoya en lo construido en 07).
- **Reportes fase 1:** ventas por día/semana/mes, productos más vendidos, ventas por categoría, y export CSV de pedidos. (Reportes avanzados: ver punto 6.)
- Correo automático al cliente cuando su pedido pasa a `shipped` (con guía).

**Queda fuera:** gestión de cotizaciones (se agrega en el módulo 10 sobre este panel), aprobación de cuentas mayoristas y precios B2B (11), edición de contenido estático/blog (no es parte de fase 1), y analítica web (12).

## 3. Dependencias

- **02 API de catálogo** y **06 Checkout** — administra las entidades que esos módulos crean. Puede empezarse tras el 06 en paralelo con el 07; la vista de pagos/facturas dentro del pedido se completa cuando 07 exista.

## 4. Skills involucradas

- `retail-backend-api-admin` — endpoints admin (5), decisión de implementación del panel (6), funcionalidades mínimas (6.x), roles (3), logging/auditoría (9).
- `retail-catalog-data-model` — reglas de integridad al editar catálogo e inventario (secciones 3–7).
- `retail-ux-design-system` — el admin usa los primitivos del design system pero con layout utilitario propio; no requiere el pulido visual del sitio público.

## 5. Listo cuando…

- [ ] Un usuario sin rol admin no puede ver ni llamar nada del panel (UI y API verificadas por separado).
- [ ] Prueba de operación completa sin tocar la base de datos: crear una categoría nueva, crear un producto con 2 variantes y 4 fotos, publicarlo — y verlo correctamente en el sitio público en staging.
- [ ] Ajustar stock desde el admin se refleja de inmediato en la disponibilidad del sitio y queda registrado quién/cuándo/motivo.
- [ ] Un pedido de prueba pagado puede avanzarse hasta `delivered`, con el correo de "enviado" llegando con la guía; el historial de estados del pedido queda visible.
- [ ] El reporte de ventas de un rango de fechas cuadra exactamente con las órdenes `paid` de ese rango (verificación manual contra la base) y el export CSV abre bien en Excel.
- [ ] Desactivar un producto lo oculta del sitio público pero no rompe pedidos históricos que lo contienen.

## 6. Riesgos y decisiones pendientes

- **Implementación del panel:** app propia en Next.js (ruta `/admin` protegida) vs. herramienta tipo admin framework — decidir según la skill de backend (sección 6) y confirmar con el dueño; recomendación: ruta protegida en el mismo frontend para reutilizar el design system y no multiplicar despliegues.
- **Niveles de rol:** ¿todos en el negocio podrán todo, o se necesita un rol "operador" (pedidos e inventario, sin tocar precios)? Preguntar cuántas personas lo usarán.
- **Alcance de reportes:** confirmar si fase 1 necesita margen/utilidad (requiere capturar costo del producto en el catálogo — decidir aquí porque afecta el modelo de datos).
- **Devoluciones en el flujo operativo:** el ciclo `delivered → return_requested → refunded` se implementa solo si la política de devoluciones (definida en 06) lo exige en fase 1.
