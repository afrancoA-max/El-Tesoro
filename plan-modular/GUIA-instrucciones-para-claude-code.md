# Guía de instrucciones para Claude Code — paso a paso

Cómo usar esta guía: cada módulo tiene un **prompt listo para copiar y pegar** en Claude Code. Dale UN módulo a la vez, en el orden de esta guía. No pegues dos prompts juntos ni le pidas "haz todo el plan": la razón de tener módulos es que cada uno se construye, se prueba y se cierra antes del siguiente.

---

## Reglas de oro (léelas antes de empezar)

1. **Una conversación por módulo.** Cuando termines un módulo (checklist cumplido), abre conversación nueva para el siguiente. Así Claude Code no arrastra contexto saturado.
2. **Cierra antes de avanzar.** No inicies un módulo si el anterior no pasó su checklist "Listo cuando…" — pídele la demostración con el prompt de verificación (más abajo).
3. **Cuando Claude Code te pregunte una decisión pendiente, respóndele tú.** Cada módulo indica qué decisiones te va a preguntar; tenlas pensadas antes de pegar el prompt.
4. **Si Claude Code propone algo fuera del alcance del módulo, recuérdale:** "eso está fuera del alcance de este módulo según el plan; anótalo y sigamos".

---

## PASO 0 — Preparación (una sola vez, antes del módulo 01)

Crea la carpeta del proyecto de código (puede ser dentro de "Página web El Tesoro" o donde prefieras) y abre Claude Code ahí. Pega esto:

```
Vamos a iniciar el proyecto de la tienda en línea "El Tesoro" (retail de hogar/cocina, Guatemala).

1. En la carpeta "Página web El Tesoro" están las 9 skills del proyecto (carpetas retail-* con su SKILL.md) y el plan modular en "plan-modular/" (13 documentos). Cópialas al proyecto: las skills a `.claude/skills/` y el plan a `docs/plan/`.
2. Lee `docs/plan/00-resumen-y-roadmap.md` completo y la skill maestra `retail-hogar-ecommerce-master`.
3. Confírmame en un resumen corto: los 12 módulos en orden, las decisiones ya tomadas (que no debes re-preguntarme) y las decisiones pendientes con el módulo donde me las preguntarás.
4. Inicializa el repositorio git con un .gitignore adecuado. NO escribas código de la aplicación todavía.
```

**Antes de pasar al módulo 01, ten decidido/preparado:** si tienes logo o colores de marca de El Tesoro (o si se diseña desde cero), tu lista real de categorías y productos (aunque sea un Excel preliminar), y tu preferencia de base de datos si la tienes (si no, deja que te proponga; la recomendación del plan es Cloud SQL/PostgreSQL).

---

## MÓDULO 01 — Fundacional

```
Construye el Módulo 01 del plan. Lee primero `docs/plan/01-fundacional.md` y las skills que ahí se indican (master, catalog-data-model, ux-design-system).

Antes de escribir código, hazme TODAS las preguntas de la sección "Riesgos y decisiones pendientes" del documento (base de datos, identidad visual, taxonomía real, idioma) y espera mis respuestas.

Luego construye exactamente el alcance del documento: taxonomía en base de datos, migraciones del modelo de catálogo (con campos B2B latentes), design tokens y componentes primitivos con la página /dev/design, y el andamiaje del monorepo con CI de lint+build. Nada de páginas públicas ni endpoints de negocio.

Al terminar, muéstrame cómo verificar cada punto del checklist "Listo cuando…" del documento.
```

**Antes de pasar al 02:** revisa tú mismo la página `/dev/design` en el navegador y aprueba los colores/tipografía — es más barato corregir estilo aquí que en el módulo 03.

---

## MÓDULO 02 — API de catálogo + staging

**Ten a mano:** tu listado real de productos (Excel/CSV con nombres, categorías, variantes, precios, stock y fotos), tu cuenta de Google Cloud creada con facturación activa, y un tope de gasto mensual aceptable para staging.

```
Construye el Módulo 02 del plan. Lee `docs/plan/02-api-catalogo.md` y las skills backend-api-admin, catalog-data-model y gcp-deployment-devops.

Pregúntame primero las decisiones pendientes del documento (framework Node, presupuesto GCP, formato de mi listado real de productos — te voy a pasar mi archivo para que diseñes el importador sobre él).

Alcance: endpoints públicos de solo lectura del catálogo, importador CSV re-ejecutable, imágenes en Cloud Storage, y el entorno de STAGING en GCP con despliegue automático. Sin autenticación, sin endpoints de escritura, sin frontend.

Al terminar: entrégame la colección de requests, la URL de staging funcionando, y la demostración del checklist "Listo cuando…".
```

**Antes de pasar al 03:** abre 2–3 endpoints de staging en el navegador y verifica que se vean tus productos reales.

---

## MÓDULO 03 — Catálogo navegable

**Ten a mano:** fotos de producto de buena calidad (o decide si se lanza con fotos de proveedor) y textos básicos de marca para la home.

```
Construye el Módulo 03 del plan. Lee `docs/plan/03-catalogo-navegable.md` y las skills frontend-react-components, ux-design-system y seo-performance.

Pregúntame primero lo pendiente del documento (assets visuales, tratamiento del botón de carrito, alcance de búsqueda).

Alcance: home, navegación con mega-menú, páginas de categoría con filtros, ficha de producto con variantes, y búsqueda — todo consumiendo la API de staging, con skeletons/estados de error, y cumpliendo la Compuerta SEO #1 (metadatos, Schema.org de producto, Lighthouse móvil: Performance ≥85, SEO ≥95, Accesibilidad ≥90). Sin carrito funcional.

Al terminar: URL de staging navegable en mi teléfono y los reportes Lighthouse de home, categoría y producto.
```

**Antes de pasar al 04:** navega el sitio en tu teléfono y da tu aprobación visual formal (el plan la exige aquí, antes de construir encima).

---

## MÓDULO 04 — Cuentas de usuario

**Ten a mano:** decisión sobre proveedor de correo transaccional (o deja que te proponga) y si pedirás teléfono desde el registro.

```
Construye el Módulo 04 del plan. Lee `docs/plan/04-cuentas-usuario.md` y las skills backend-api-admin (sección de auth y roles) y frontend-react-components.

Pregúntame primero: proveedor de autenticación (recomendación del plan: propia con JWT), proveedor de correo transaccional, y datos mínimos de registro.

Alcance: registro con verificación por correo, login/logout, recuperación de contraseña, perfil con NIT y libreta de direcciones (Guatemala), sección "Mis pedidos" vacía, y el modelo de roles customer/admin/wholesale. El checkout de invitado ya está decidido: las cuentas son opcionales.

Al terminar: demostración del checklist en staging con un correo real mío de prueba.
```

---

## MÓDULO 05 — Carrito

```
Construye el Módulo 05 del plan. Lee `docs/plan/05-carrito.md` y las skills cart-checkout, frontend-react-components y ux-design-system.

Confírmame antes: caducidad del carrito anónimo (el plan propone 30 días).

Alcance: agregar al carrito desde ficha y tarjeta, mini-carrito y página de carrito, persistencia anónima + fusión al iniciar sesión, validación de stock y revalidación de precios contra la API. El carrito solo VALIDA stock, no lo reserva (eso es del módulo 06). El botón final lleva a una pantalla interna "próximamente".

Al terminar: demostración del checklist en staging, incluyendo la fusión de carrito anónimo con cuenta.
```

---

## MÓDULO 06 — Checkout (orden sin cobro)

**ANTES de pegar el prompt, resuelve con calma (son decisiones de negocio, no técnicas):** transportista(s) y tarifas de envío por departamento/peso, si habrá envío gratis desde cierto monto, si existe "recoger en tienda", tu política de devoluciones y garantías por escrito, y el manejo de cristalería frágil. **También: inicia YA los trámites externos del módulo 07** (alta de comercio en la pasarela que elijas y afiliación FEL con un certificador) porque tardan semanas.

```
Construye el Módulo 06 del plan. Lee `docs/plan/06-checkout.md` y las skills cart-checkout, backend-api-admin y ux-design-system.

Pregúntame primero TODAS las decisiones pendientes del documento (política de envíos completa, expiración de reserva de stock, cupones sí/no en fase 1, devoluciones). Tengo las respuestas listas.

Alcance: flujo de checkout por pasos (invitado y con sesión), dirección de Guatemala, datos FEL (NIT/CF), métodos de envío con costo, totales finales con IVA incluido, creación de orden con correlativo y snapshot, y reserva de stock con expiración. Se detiene EXACTAMENTE antes de cobrar: el botón "Pagar" lleva a pantalla interna.

Al terminar: demostración del checklist, incluyendo la expiración de reserva y que las órdenes aparezcan en "Mis pedidos".
```

---

## MÓDULO 07 — Cobro en línea + FEL

**Requisito para empezar:** tener credenciales de SANDBOX de la pasarela elegida y del ambiente de pruebas del certificador FEL. Si aún no llegan, puedes adelantar el módulo 08 en paralelo y volver aquí.

```
Construye el Módulo 07 del plan. Lee `docs/plan/07-pagos-en-linea.md` y la skill payments-integration completa (más la frontera con cart-checkout).

La pasarela elegida es [NOMBRE] y el certificador FEL es [NOMBRE]; te paso las credenciales de sandbox por variables de entorno (nunca al repositorio). Pregúntame lo demás pendiente del documento (cuotas, contra entrega).

Alcance: intento de pago desde la orden, webhooks idempotentes y verificados por firma como fuente de verdad, estados pending_payment→paid/failed/expired con reintento, pantalla y correo de confirmación, emisión FEL con PDF al correo y en "Mis pedidos", y descuento definitivo de stock.

Al terminar: demostración del checklist con las tarjetas de prueba del sandbox, incluyendo el caso de webhook duplicado y el de pago rechazado.
```

---

## MÓDULO 08 — Panel de administración

**Ten a mano:** cuántas personas usarán el admin y si necesitas un rol "operador" limitado; si quieres reportes de margen/utilidad (implica capturar costo por producto).

```
Construye el Módulo 08 del plan. Lee `docs/plan/08-panel-administracion.md` y las skills backend-api-admin (secciones 5 y 6) y catalog-data-model.

Pregúntame primero: implementación del panel (el plan recomienda ruta /admin protegida en el mismo Next.js), niveles de rol, alcance de reportes, y devoluciones en el flujo operativo.

Alcance: CRUD de catálogo con imágenes, inventario con ajustes auditados y alertas de stock bajo, gestión de pedidos con ciclo paid→preparing→shipped→delivered y correo de envío con guía, reportes de ventas con export CSV, y el importador CSV integrado.

Al terminar: demostración del checklist — en especial la prueba completa "crear producto desde el admin y verlo publicado en el sitio sin tocar la base de datos".
```

---

## MÓDULO 09 — Producción + dominio (LANZAMIENTO)

**ANTES de empezar:** compra el dominio definitivo, verifica que las credenciales PRODUCTIVAS de pasarela y FEL ya estén aprobadas, y ten listas tus páginas legales (términos, privacidad, devoluciones).

```
Construye el Módulo 09 del plan. Lee `docs/plan/09-produccion-gcp.md` y las skills gcp-deployment-devops (completa) y seo-performance (compuerta #2).

El dominio es [DOMINIO]. Pregúntame lo pendiente del documento (correo del dominio, presupuesto de producción, soft launch).

Alcance: entorno de producción separado con respaldos probados, dominio con HTTPS y CDN, despliegue a producción con aprobación manual y rollback probado, monitoreo con alertas, auditoría SEO pre-lanzamiento sobre el dominio real, y el checklist de lanzamiento (incluida una compra real de monto bajo con su FEL verificada en SAT).

No abrimos al público hasta que TODO el checklist "Listo cuando…" esté demostrado.
```

**Después del lanzamiento:** los módulos 10 y 12 pueden ir en paralelo (conversaciones separadas).

---

## MÓDULO 10 — Cotizaciones

**Ten a mano:** datos bancarios exactos para el PDF de cotización, vigencia por defecto (el plan propone 15 días), y si la cotización pagada factura FEL automáticamente.

```
Construye el Módulo 10 del plan. Lee `docs/plan/10-cotizaciones.md` y las skills cart-checkout, backend-api-admin y payments-integration (solo links de pago).

Pregúntame primero las decisiones pendientes del documento — tengo listos los datos bancarios y la vigencia.

Alcance: "Solicitar cotización" desde el carrito, ciclo requested→sent→accepted→pending_payment→paid→converted_to_order con auditoría, gestión y edición en el admin con envío de PDF por correo, registro MANUAL de pago por transferencia (con doble confirmación) que convierte a orden y descuenta stock en ese momento, página pública de consulta por token, y link de pago si la pasarela lo permite. Las cotizaciones NO reservan stock.

Al terminar: demostración del checklist con un ciclo completo de cotización hasta orden entregable.
```

---

## MÓDULO 11 — Portal mayorista B2B

**Ten a mano (decisiones de negocio):** precio mayorista único vs. escalas por volumen (el plan recomienda único en fase 1), mínimo de compra (por producto, por monto, o ambos), y qué documentos pedirás para aprobar a un mayorista.

```
Construye el Módulo 11 del plan. Lee `docs/plan/11-portal-mayorista.md` y las skills catalog-data-model, backend-api-admin y frontend-react-components.

Pregúntame primero las decisiones pendientes (estructura de precios B2B, mínimos, criterios de aprobación, envío B2B, stock de seguridad).

Alcance: página pública de mayoristas con formulario de solicitud, cola de aprobación en el admin que activa el rol wholesale, precios mayoristas y mínimos visibles solo con ese rol (verificado también a nivel de API, no solo UI), carrito B2B cuyo único camino es cotización, e historial B2B en la cuenta.

Al terminar: demostración del checklist, en especial que la API jamás entregue precios B2B a sesiones sin el rol.
```

---

## MÓDULO 12 — SEO y rendimiento (consolidación)

```
Construye el Módulo 12 del plan. Lee `docs/plan/12-seo-performance.md` y la skill seo-performance completa.

Pregúntame primero: herramienta de analítica (el plan recomienda GA4 + Search Console) y si activamos Google Merchant Center en esta fase.

Alcance: analítica con eventos de e-commerce del funnel completo, feed de Merchant Center desde el catálogo, medición de Core Web Vitals con datos reales y corrección de lo que falle, presupuesto de rendimiento en CI, y la rutina de auditoría mensual documentada.

Al terminar: demostración del checklist, incluyendo el funnel completo registrado en GA4 con una compra de prueba.
```

---

## Prompts auxiliares (úsalos cuando los necesites)

**Para verificar un módulo antes de cerrarlo:**
```
Revisa el checklist "Listo cuando…" de docs/plan/[archivo del módulo].md y demuéstrame punto por punto que se cumple en staging, indicándome qué debo abrir o probar yo mismo para confirmarlo. Lo que no se cumpla, corrígelo antes de continuar.
```

**Para retomar en una conversación nueva:**
```
Continuamos el proyecto El Tesoro. Lee docs/plan/00-resumen-y-roadmap.md. Los módulos [X, Y] ya están terminados y verificados. Hoy trabajamos el módulo [Z]: lee su documento y las skills que indica antes de proponer nada.
```

**Si se sale del alcance:**
```
Eso pertenece al módulo [N] según el plan. Anótalo como pendiente en docs/plan/ y volvamos al alcance del módulo actual.
```
