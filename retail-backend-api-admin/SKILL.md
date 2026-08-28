---
name: retail-backend-api-admin
description: API de Node.js y panel de administración de la tienda de hogar — arquitectura de rutas/controladores/servicios, autenticación y roles (cliente vs. administrador), endpoints CRUD de productos/categorías/inventario, gestión de pedidos, reportes de ventas básicos, y todo lo relacionado al "back office" del negocio. Úsala SIEMPRE que se escriba código de servidor en Node.js, se defina un endpoint de API, se implemente autenticación/autorización, se construya cualquier pantalla o funcionalidad del panel administrativo, o se gestione la lógica de pedidos desde el lado del negocio (no del cliente comprando). No la uses para el esquema de base de datos (usa retail-catalog-data-model, esta skill lo CONSUME), para componentes visuales del cliente final (usa retail-frontend-react-components/retail-ux-design-system), para el flujo de carrito/checkout del comprador (usa retail-cart-checkout), ni para el cobro en línea (usa retail-payments-integration) — esta skill expone y administra los datos, no cobra ni define la experiencia de compra del cliente.
---

# Retail Hogar E-commerce — Backend API y Panel de Administración

Esta skill cubre todo el "back office": la API de Node.js que sirve datos al frontend público y al panel administrativo, más el panel mismo (gestión de catálogo, pedidos y reportes). Se fusionaron ambos dominios porque comparten modelos, autenticación y buena parte de la lógica de negocio — separarlos generaría duplicación.

---

## 1. Decisión de framework Node.js (confirmar con el usuario si no está fijada)

| Criterio | Express | Fastify | NestJS |
|---|---|---|---|
| Curva de aprendizaje | Baja, muy flexible | Baja-media | Media-alta, más estructura desde el inicio |
| Estructura impuesta | Ninguna (hay que definirla, ver sección 2) | Ninguna | Fuerte (módulos, inyección de dependencias) — ventaja para un proyecto que crecerá (catálogo + carrito + pagos + admin) |
| Rendimiento | Bueno | Superior (benchmarks) | Bueno (corre sobre Express o Fastify internamente) |
| Ecosistema/madurez | Enorme, la más usada | Creciente | Sólido, popular en proyectos enterprise/TypeScript |

**Recomendación por defecto:** Express con TypeScript y una estructura modular disciplinada (definida en la sección 2) — buen balance entre simplicidad y las buenas prácticas profesionales que el negocio requiere, sin la sobrecarga de aprendizaje de NestJS. Si el equipo ya tiene experiencia con NestJS o el proyecto se anticipa muy grande, es alternativa válida y las convenciones de esta skill se adaptan a sus módulos/controladores/providers de forma directa.

---

## 2. Estructura de carpetas del backend

Dentro de `backend/src/` (definida en la skill maestra):

```
src/
├── routes/
│   ├── public/            # Rutas consumidas por el frontend de cliente
│   │   ├── products.routes.ts
│   │   ├── categories.routes.ts
│   │   └── orders.routes.ts        # creación de orden, no gestión
│   └── admin/              # Rutas protegidas por rol admin
│       ├── products.admin.routes.ts
│       ├── inventory.admin.routes.ts
│       ├── orders.admin.routes.ts
│       └── reports.admin.routes.ts
├── controllers/            # Un archivo por recurso, delgados — delegan a services
├── services/                # Lógica de negocio real (ej. productService, orderService)
├── models/ (o repositories/) # Acceso a datos, mapea al esquema de retail-catalog-data-model
├── middlewares/
│   ├── auth.middleware.ts   # Verifica sesión/JWT
│   ├── roles.middleware.ts  # requireRole('admin')
│   ├── validate.middleware.ts # Validación de body/params (Zod/Joi)
│   └── errorHandler.middleware.ts
├── validators/               # Esquemas de validación por endpoint
└── config/                   # Conexión a DB, variables de entorno, constantes
```

**Regla de capas:** controller → service → model/repository. Los controladores nunca acceden directamente a la base de datos, y los services nunca conocen detalles de HTTP (req/res) — esto permite reusar lógica de negocio entre rutas públicas y admin sin duplicar código.

---

## 3. Autenticación y roles

- **Mecanismo:** JWT (access token corto + refresh token) o sesiones con cookie httpOnly — decidir con el usuario según si habrá app móvil futura (JWT es más portable) o solo web (cookies de sesión son más simples y seguras contra XSS).
- **Roles mínimos requeridos:**
  - `cliente`: puede ver catálogo, gestionar su propio carrito/cuenta/pedidos.
  - `admin`: acceso a `routes/admin/*`, gestión completa de catálogo, pedidos, reportes.
  - (Opcional, si el negocio lo requiere) `operador`: acceso limitado a gestión de pedidos e inventario, sin poder crear/eliminar productos ni ver reportes financieros — definir con el usuario si aplica.
- Todo endpoint bajo `/admin` pasa obligatoriamente por `auth.middleware` + `roles.middleware('admin')` — nunca confiar en que el frontend oculte el enlace al panel como única protección.
- Contraseñas siempre hasheadas (bcrypt/argon2), nunca almacenadas ni logueadas en texto plano.

---

## 4. Endpoints públicos (consumidos por `retail-frontend-react-components`)

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/categories` | Árbol de categorías |
| GET | `/api/categories/:slug/products` | Productos de una categoría, con filtros/paginación por query params |
| GET | `/api/products/:slug` | Detalle de producto con variantes, imágenes, relacionados |
| GET | `/api/search?q=` | Búsqueda de texto en catálogo |
| POST | `/api/orders` | Creación de orden (usado por `retail-cart-checkout`, no gestión) |
| GET | `/api/orders/:id` | Consulta de una orden propia (usuario autenticado) |

Todos con paginación consistente (`page`, `limit`, `total`) y manejo de errores estandarizado (ver sección 7).

---

## 5. Endpoints de administración (consumidos por el panel admin)

### Catálogo
| Método | Ruta | Función |
|---|---|---|
| POST/PUT/DELETE | `/api/admin/products` | CRUD de productos |
| POST/PUT/DELETE | `/api/admin/products/:id/variants` | CRUD de variantes |
| POST/PUT/DELETE | `/api/admin/categories` | CRUD de categorías |
| PATCH | `/api/admin/inventory/:variantId` | Ajuste manual de stock |

### Pedidos
| Método | Ruta | Función |
|---|---|---|
| GET | `/api/admin/orders` | Listado con filtros (estado, fecha, cliente) |
| GET | `/api/admin/orders/:id` | Detalle completo de una orden |
| PATCH | `/api/admin/orders/:id/status` | Cambiar estado (pendiente → confirmado → enviado → entregado / cancelado) |

### Reportes
| Método | Ruta | Función |
|---|---|---|
| GET | `/api/admin/reports/sales?desde=&hasta=` | Ventas totales, por categoría, por producto en rango de fechas |
| GET | `/api/admin/reports/low-stock` | Productos bajo el umbral de stock definido en el modelo de datos |

---

## 6. Panel de administración — decisión de implementación

| Opción | Descripción | Cuándo conviene |
|---|---|---|
| Integrado en la misma app React, bajo `/admin`, protegido por rol | Reutiliza el mismo build, componentes UI base y sistema de diseño | Equipo pequeño, quiere un solo despliegue — **recomendación por defecto** |
| App React separada solo para admin | Bundle independiente, no se carga en el sitio público | Si el panel crece mucho y se quiere evitar que su peso afecte el sitio de cliente |
| Framework de admin (ej. React Admin) sobre la misma API | Acelera CRUDs estándar | Si se prioriza velocidad de desarrollo del panel sobre personalización visual |

**Recomendación por defecto:** integrado bajo `/admin` en la misma app React (coordinando con `retail-frontend-react-components` para el ruteo y con `retail-ux-design-system` para mantener consistencia visual, aunque el panel puede ser visualmente más funcional/denso que el sitio público — no necesita el mismo nivel de "alto impacto" que las páginas de cliente).

### Funcionalidades mínimas del panel
- Login de administrador (independiente del login de cliente).
- Gestión de catálogo: crear/editar/desactivar productos, variantes, categorías; carga de imágenes (vía `retail-gcp-deployment-devops` para almacenamiento).
- Gestión de inventario: ver stock actual, ajustar manualmente, alertas de stock bajo.
- Gestión de pedidos: listado filtrable, detalle, cambio de estado, historial.
- Reportes básicos: ventas por período, productos más vendidos, productos con bajo stock.
- Gestión de usuarios administradores (crear/desactivar, asignar rol) si hay más de un administrador.

---

## 7. Manejo de errores y respuestas

Formato de respuesta consistente en toda la API:

```json
// Éxito
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "PRODUCT_NOT_FOUND", "message": "..." } }
```

- Middleware centralizado de errores (`errorHandler.middleware`) captura excepciones de los services y las traduce a códigos HTTP correctos (400 validación, 401 no autenticado, 403 sin permiso, 404 no encontrado, 409 conflicto de stock, 500 error de servidor).
- Nunca exponer stack traces ni detalles internos en la respuesta al cliente en producción — sí en logs internos (ver sección 9).

---

## 8. Validación y seguridad

- Validación de entrada en cada endpoint con esquemas (Zod/Joi) en `validators/` — rechazar antes de llegar al service.
- Rate limiting en rutas sensibles (login, creación de órdenes) para mitigar abuso.
- Sanitización de inputs para prevenir inyección (usar el ORM/query builder parametrizado, nunca concatenar SQL manualmente).
- CORS configurado explícitamente para permitir solo los dominios del frontend del proyecto.
- Secretos (JWT secret, credenciales de DB) siempre vía variables de entorno gestionadas en `retail-gcp-deployment-devops`, nunca hardcoded ni en el repositorio.

---

## 9. Logging

- Logger estructurado (ej. Pino o Winston) — no `console.log` disperso.
- Niveles: `info` para operaciones normales (orden creada, producto actualizado), `warn` para situaciones anómalas no críticas (intento de ajustar stock inexistente), `error` para fallos que requieren atención.
- Nunca loguear contraseñas, tokens completos, ni datos de pago — solo referencias/IDs.

---

## 10. Qué NO cubre esta skill

- Estructura de base de datos y modelo de producto/variante/inventario → `retail-catalog-data-model` (esta skill la consume vía `models/`/`repositories/`).
- Diseño visual del panel o del sitio público → `retail-ux-design-system`.
- Componentes React del panel o del sitio → `retail-frontend-react-components`.
- Lógica de carrito y checkout del lado del comprador (reserva de stock al comprar, cálculo de envío) → `retail-cart-checkout`.
- Integración real con la pasarela de pago y webhooks de confirmación → `retail-payments-integration`.
- Despliegue de esta API a Google Cloud → `retail-gcp-deployment-devops`.
