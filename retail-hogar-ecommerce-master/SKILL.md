---
name: retail-hogar-ecommerce-master
description: Skill maestra y orquestadora para el desarrollo de la tienda en línea de productos para el hogar (ollas, sartenes, electrodomésticos pequeños, cristalería y categorías afines de cocina/hogar). Úsala SIEMPRE al iniciar cualquier tarea de este proyecto, antes de tocar código, diseño, base de datos, pagos o despliegue: define la visión de negocio, el stack oficial (React + Node.js + Google Cloud), la estructura de carpetas, las convenciones transversales de calidad, y el directorio de qué skill complementaria usar según la tarea (UX, catálogo, frontend, backend/admin, carrito/checkout, pagos, despliegue GCP, SEO/performance). Actívala también cuando el usuario mencione "la tienda", "el proyecto de la tienda de hogar", "la página de ollas/sartenes/electrodomésticos/cristalería", o pida coordinar trabajo entre varias áreas del sitio.
---

# Retail Hogar E-commerce — Skill Maestra

Esta es la skill orquestadora del proyecto. Su función NO es implementar el detalle técnico de cada módulo (para eso existen las skills complementarias), sino:

1. Fijar la visión y el contexto de negocio que todas las demás skills deben respetar.
2. Fijar el stack tecnológico y las decisiones de arquitectura que no deben re-discutirse en cada tarea.
3. Dirigir a Claude hacia la skill correcta según lo que el usuario pida.
4. Mantener consistencia de calidad, nomenclatura y estructura en todo el proyecto, sin importar qué skill esté trabajando en un momento dado.

Si una tarea toca más de un dominio (ej. "crea la página de categoría de sartenes con su API"), esta skill es el punto de partida: aquí se decide el orden de trabajo y qué skills complementarias intervienen.

---

## 1. Visión de negocio del proyecto

- **Nicho:** tienda en línea especializada en productos para el hogar, con énfasis en cocina: ollas, sartenes, electrodomésticos pequeños (licuadoras, freidoras de aire, tostadoras, etc.), cristalería, y categorías relacionadas (utensilios, contenedores, menaje de mesa).
- **Modelo de negocio:** e-commerce transaccional — venta directa al consumidor con cobro en línea, no solo catálogo informativo.
- **Diferenciadores exigidos por el negocio:**
  - Visualmente agradable y de "alto impacto" — no una plantilla genérica; debe transmitir calidad y confianza (importante en productos de cocina donde el material, acabado y tamaño se venden con la imagen).
  - Navegación fácil e intuitiva entre múltiples categorías y subcategorías.
  - Moderna y funcional — rendimiento real, no solo estética.
- **Público objetivo:** compradores finales (B2C) que buscan equipar o renovar su cocina/hogar; decisión de compra influida por fotografía de producto, variantes (tamaño, material, color, capacidad) y confianza en el checkout.

Toda skill complementaria debe alinear sus decisiones (visuales, técnicas o de flujo) con esta visión. Si una skill complementaria debe tomar una decisión de negocio no cubierta aquí, debe preguntarle al usuario en vez de asumir.

---

## 2. Stack tecnológico oficial

No renegociar estas decisiones en cada tarea — son la base fija del proyecto:

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | React (SPA o framework como Next.js si el usuario lo confirma) | Ver `retail-frontend-react-components` para detalle |
| Backend | Node.js (API REST) | Ver `retail-backend-api-admin` |
| Base de datos | A definir con el usuario en `retail-catalog-data-model` (Firestore o Cloud SQL) | Debe quedar fijado ahí y no volver a discutirse |
| Hosting/Infraestructura | Google Cloud Platform | Ver `retail-gcp-deployment-devops` |
| Pagos | Pasarela de pago en línea a definir en `retail-payments-integration` | Debe soportar mercado de Guatemala/Centroamérica |

Cuando el usuario no haya confirmado aún una sub-decisión (ej. Next.js vs. Create React App/Vite, Firestore vs. Cloud SQL, proveedor de pagos), la skill correspondiente debe preguntarlo explícitamente la primera vez y luego tratarlo como decisión fija para el resto del proyecto.

---

## 3. Estructura de carpetas del proyecto

Estructura de monorepo recomendada (ajustable si el usuario prefiere repos separados):

```
retail-hogar-ecommerce/
├── frontend/                 # App React
│   ├── src/
│   │   ├── components/       # Componentes reutilizables (ver design system)
│   │   ├── pages/            # Páginas: home, categoría, producto, carrito, checkout
│   │   ├── hooks/
│   │   ├── services/         # Llamadas a la API
│   │   ├── context/ o store/ # Manejo de estado global
│   │   └── styles/
│   └── public/
├── backend/                   # API Node.js + panel admin
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── middlewares/
│   │   ├── services/          # Lógica de negocio (catálogo, órdenes, pagos)
│   │   └── config/
│   └── admin/                 # Si el panel admin es una app separada dentro del backend
├── shared/                    # Tipos/constantes compartidos entre frontend y backend (opcional)
├── infra/                     # Configuración de despliegue GCP, CI/CD
└── docs/                      # Documentación técnica y de negocio del proyecto
```

Cualquier skill complementaria que genere código debe respetar esta ubicación de carpetas salvo que el usuario indique lo contrario.

---

## 4. Convenciones transversales de calidad

Aplican a todas las skills complementarias, sin excepción:

- **Nomenclatura:** inglés para código (variables, funciones, componentes, rutas de API), español permitido para contenido visible al usuario final (textos de UI, nombres de categorías/productos).
- **Componentes React:** funcionales con hooks, tipados (TypeScript recomendado; confirmar con el usuario si no se ha definido).
- **API:** RESTful, respuestas JSON consistentes, códigos de estado HTTP correctos, manejo de errores centralizado.
- **Seguridad base:** nunca exponer credenciales o llaves en el frontend ni en el repositorio; variables sensibles siempre vía variables de entorno (detalle en `retail-gcp-deployment-devops`).
- **Accesibilidad y SEO:** cada página nueva debe considerar HTML semántico y metadatos básicos desde su creación (detalle en `retail-seo-performance`).
- **Responsividad:** todo componente visual se diseña mobile-first (gran parte del tráfico de retail es móvil).
- **Consistencia visual:** ningún componente nuevo se crea sin referirse primero al sistema de diseño (`retail-ux-design-system`) para colores, tipografía y patrones ya definidos.

---

## 5. Directorio de skills complementarias — cuál usar según la tarea

Usa esta tabla para decidir qué skill(s) complementaria(s) consultar. Si la tarea cruza varios dominios, consulta las skills en el orden en que aparecen aquí.

| Si el usuario pide... | Usa la skill |
|---|---|
| Colores, tipografía, estilo visual, componentes UI genéricos, patrones de navegación por categoría | `retail-ux-design-system` |
| Definir categorías/subcategorías, atributos de producto (talla, material, color), estructura de base de datos, inventario | `retail-catalog-data-model` |
| Construir páginas o componentes React, manejo de estado del frontend, consumo de API desde el cliente | `retail-frontend-react-components` |
| Endpoints de API, autenticación, lógica de negocio del servidor, panel de administración, CRUD de productos/pedidos, reportes de ventas | `retail-backend-api-admin` |
| Carrito de compras, flujo de checkout (antes de cobrar), cálculo de envío/impuestos, validación de stock al comprar | `retail-cart-checkout` |
| Integración de la pasarela de pago, webhooks de confirmación, estados de pago, facturación | `retail-payments-integration` |
| Despliegue a Google Cloud, CI/CD, dominios, variables de entorno en producción, escalabilidad | `retail-gcp-deployment-devops` |
| SEO técnico, velocidad de carga, optimización de imágenes, Core Web Vitals, accesibilidad | `retail-seo-performance` |

**Regla de frontera importante:** `retail-cart-checkout` arma y valida la orden; `retail-payments-integration` solo la cobra y actualiza su estado. No mezclar lógica de pasarela de pago dentro del checkout ni viceversa.

---

## 6. Roadmap sugerido de construcción del proyecto

Orden recomendado cuando se arranca desde cero (ajustable según lo que el usuario ya tenga avanzado):

1. **Fundacional:** `retail-catalog-data-model` (definir qué se vende y cómo se estructura) + `retail-ux-design-system` (definir cómo se ve) — pueden avanzar en paralelo.
2. **Backend base:** `retail-backend-api-admin` (API de catálogo, auth, primeras rutas admin).
3. **Frontend base:** `retail-frontend-react-components` (home, listado de categorías, ficha de producto) consumiendo la API anterior.
4. **Transaccional:** `retail-cart-checkout` seguido de `retail-payments-integration`.
5. **Panel administrativo completo:** resto de `retail-backend-api-admin` (gestión de pedidos, reportes).
6. **Infraestructura:** `retail-gcp-deployment-devops` — idealmente configurar un entorno de staging desde el paso 2, no dejarlo solo para el final.
7. **Pulido transversal:** `retail-seo-performance` — aplicar de forma continua, no como fase única al final.

---

## 7. Cómo debe comportarse esta skill al iniciar una conversación

- Si el usuario pide algo que cae claramente en el dominio de una sola skill complementaria, indícalo brevemente y procede a aplicar esa skill.
- Si la tarea es ambigua o cruza dominios, usa el roadmap y la tabla de la sección 5 para proponer un orden de trabajo antes de generar código.
- Si el usuario intenta tomar una decisión que contradice una decisión ya fijada en esta skill maestra (ej. cambiar de Google Cloud a otro proveedor), señálalo explícitamente y confirma el cambio antes de proceder, ya que afecta a todas las demás skills.
- Nunca implementes una funcionalidad de pagos o manejo de datos sensibles sin pasar por `retail-payments-integration`, incluso si parece una tarea pequeña.
