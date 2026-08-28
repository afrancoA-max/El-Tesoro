# Plan Modular — Tienda en Línea "El Tesoro" (Retail Hogar)

**Propósito de este documento:** panorama completo del proyecto dividido en 12 módulos funcionales, en orden de construcción. Cada módulo tiene su propio documento (`01` a `12`) con alcance, dependencias, skills, criterios de aceptación y decisiones pendientes. Este plan es para alineación — Claude Code lo usará como hoja de ruta y consultará las 9 skills del proyecto al implementar cada módulo.

---

## Decisiones de negocio ya tomadas (no re-preguntar)

| Decisión | Valor fijado |
|---|---|
| Frontend | Next.js (React) — confirmado por SEO |
| Backend | Node.js, API REST |
| Hosting | Google Cloud Platform |
| Mercado fase 1 | **Solo Guatemala** (cobro, envío y FEL). Centroamérica queda como fase 2; el diseño de datos debe quedar preparado para multi-país pero no se implementa. |
| Modelo mayorista | **Cuenta B2B aprobada manualmente**: el mayorista se registra, un admin aprueba su cuenta, al iniciar sesión ve precios mayoristas y mínimos de compra, y sus pedidos entran como **cotización** (no cobro en línea directo). Reutiliza el módulo 10. |
| Checkout de invitado | **Habilitado desde el primer día del checkout** (ver justificación en módulo 04). |
| Moneda fase 1 | Quetzal (GTQ). |

## Decisiones globales PENDIENTES (Claude Code debe preguntar antes de asumir)

| Decisión | Se resuelve a más tardar en | Detalle en |
|---|---|---|
| Base de datos: Cloud SQL/PostgreSQL (recomendada) vs. Firestore | Módulo 01 | `01-fundacional.md` |
| Framework Node.js (Express / Fastify / NestJS) | Módulo 02 | `02-api-catalogo.md` |
| Pasarela de pago (Recurrente, Pagalo/Visanet, NeoNet, etc.) | Antes de iniciar módulo 07 | `07-pagos-en-linea.md` |
| Certificador FEL (Infile, Digifact, Megaprint, etc.) | Antes de iniciar módulo 07 | `07-pagos-en-linea.md` |
| Transportista(s) y tarifas de envío | Antes de iniciar módulo 06 | `06-checkout.md` |
| Dominio definitivo del sitio | Antes de iniciar módulo 09 | `09-produccion-gcp.md` |
| Política de devoluciones y garantías | Antes de iniciar módulo 06 | `06-checkout.md` |

---

## Tabla resumen de módulos

| # | Módulo | Depende de | Skills involucradas |
|---|---|---|---|
| 01 | Fundacional: taxonomía + sistema de diseño + andamiaje | — | master, ux-design-system, catalog-data-model, gcp-deployment (parcial) |
| 02 | API de catálogo + datos semilla + staging | 01 | master, catalog-data-model, backend-api-admin, gcp-deployment (parcial) |
| 03 | Catálogo navegable (frontend público) | 01, 02 | ux-design-system, frontend-react-components, seo-performance (1ª validación) |
| 04 | Cuentas de usuario | 02 | backend-api-admin (auth), frontend-react-components, ux-design-system |
| 05 | Carrito de compras | 03 | cart-checkout, frontend-react-components, ux-design-system |
| 06 | Checkout — creación de orden (sin cobro) | 04, 05 | cart-checkout, backend-api-admin, ux-design-system |
| 07 | Cobro en línea + FEL + confirmación | 06 | payments-integration, cart-checkout (frontera), backend-api-admin |
| 08 | Panel de administración | 02, 06 (07 para pagos visibles) | backend-api-admin, catalog-data-model, ux-design-system (parcial) |
| 09 | Producción en GCP + dominio — **lanzamiento B2C** | 01–08 | gcp-deployment-devops, seo-performance (auditoría pre-lanzamiento) |
| 10 | Cotizaciones (pago por transferencia / link, estado manual) | 06, 08 | cart-checkout, backend-api-admin, payments-integration (solo links de pago) |
| 11 | Portal mayorista B2B | 04, 08, 10 | catalog-data-model (precios), backend-api-admin, frontend-react-components, ux-design-system |
| 12 | SEO y rendimiento — consolidación | Transversal; cierre tras 09 | seo-performance, gcp-deployment (CDN/caché), frontend-react-components |

---

## Cambios respecto al orden que propusiste (y por qué)

1. **Se insertó el módulo 02 (API de catálogo) entre "Fundacional" y "Catálogo navegable".** Un catálogo navegable "sin transacción" igual necesita una API real que servir; construirla como módulo propio permite probarla de forma independiente (colección de requests, datos semilla) y evita que el frontend nazca contra datos falsos que luego hay que migrar. La carga inicial de productos se hace con scripts de importación (CSV), no con el panel admin, para no adelantar el módulo 08.
2. **El entorno de staging en GCP se activa en el módulo 02, no en el 09.** Desplegar por primera vez al final es exactamente el "big bang" que quieres evitar: los problemas de infraestructura (conexión a base de datos, variables de entorno, imágenes) aparecen tarde y caros. Desde el módulo 02, cada módulo se considera terminado solo cuando funciona **en staging**, no solo en la máquina local. El módulo 09 queda reducido a producción + dominio + endurecimiento, que es un paso pequeño y de bajo riesgo si staging existió siempre.
3. **El panel de administración (08) va antes del lanzamiento (09), y las cotizaciones (10) y mayoristas (11) van después.** Razón: no se puede operar una tienda en producción sin gestionar pedidos e inventario (por eso 08 antes de 09), pero cotizaciones y B2B son ingresos adicionales que no deben retrasar el inicio de ventas B2C. Con el pipeline de despliegue ya funcionando, 10 y 11 se lanzan incrementalmente sin riesgo.
4. **Mayoristas es un módulo propio (11) y se construye sobre Cotizaciones (10).** El modelo elegido (cuenta B2B aprobada + pedido vía cotización cobrada por transferencia o link de pago) hace que el 90% de la mecánica B2B ya exista al terminar el módulo 10; el 11 solo agrega la capa de cuentas aprobadas y precios mayoristas.
5. **SEO/rendimiento (12) es transversal con tres compuertas de validación**, no una fase final: primera validación al cerrar el módulo 03, auditoría completa pre-lanzamiento dentro del módulo 09, y consolidación + medición continua como módulo 12. El detalle de qué se valida en cada compuerta está en `12-seo-performance.md`.
6. **Cuentas de usuario (04) se mantiene antes del carrito, pero el carrito NO depende de él.** 04 y 05 pueden construirse en paralelo si hay capacidad: el carrito es anónimo por diseño y el checkout de invitado está habilitado. Se conserva la posición 04 porque la infraestructura de autenticación que crea (tokens, roles) la necesitan después el panel admin (08) y el portal B2B (11).

---

## Diagrama de orden y dependencias

```
01 Fundacional (taxonomía + design system + andamiaje)
│
├──► 02 API de catálogo + seed + STAGING activo
│     │
│     ├──► 03 Catálogo navegable (frontend)   ◄─ COMPUERTA SEO #1
│     │     │
│     │     └──► 05 Carrito
│     │           │
│     ├──► 04 Cuentas de usuario ──┐
│     │                            │
│     │           ┌────────────────┘
│     │           ▼
│     │     06 Checkout (orden creada, sin cobro)
│     │           │
│     │           ├──► 07 Cobro en línea + FEL + confirmación
│     │           │           │
│     └──────────►│           │
│           08 Panel de administración
│                 │
│                 ▼
│           09 PRODUCCIÓN + dominio ── LANZAMIENTO B2C   ◄─ COMPUERTA SEO #2
│                 │
│                 ├──► 10 Cotizaciones (transferencia / link de pago)
│                 │           │
│                 │           └──► 11 Portal mayorista B2B
│                 │
│                 └──► 12 SEO y rendimiento — consolidación   ◄─ COMPUERTA SEO #3
│
(SEO/perf corre transversal desde 03; staging GCP corre transversal desde 02)
```

**Regla de avance:** un módulo no inicia hasta que sus dependencias cumplan su checklist de "listo cuando…" en **staging**. Excepciones de paralelismo permitidas: 04 ∥ 05, y 10 ∥ 12.
