# Módulo 06 — Checkout: creación de la orden (sin cobro)

## 1. Nombre y objetivo

**Checkout.** Convertir un carrito en una orden formal — datos del comprador, dirección, método de envío, totales finales y reserva de stock — deteniéndose exactamente antes de cobrar.

## 2. Alcance funcional

**Incluye:**

- Flujo de checkout por pasos (según la skill de carrito/checkout): identificación → envío → resumen. **Como invitado** (correo + teléfono) o con sesión iniciada (direcciones y NIT precargados del módulo 04).
- Captura de dirección de envío (Guatemala: departamento/municipio de lista) y de datos de facturación FEL: NIT o "CF", nombre/razón social. Estos datos viajan con la orden; la emisión de la factura es del módulo 07.
- Métodos y costos de envío según la política que defina el negocio (ver punto 6): selección visible con precio y tiempo estimado por método; soporte para "recoger en tienda" si el negocio lo confirma.
- Cálculo de totales finales: subtotal, envío, descuentos si aplican; **precios con IVA incluido** (práctica estándar GT — el desglose fiscal lo maneja FEL en 07).
- Creación de la orden con número correlativo legible (ej. `ELT-2026-00001`), estado inicial `pending_payment`, snapshot de precios y productos (la orden no cambia si el catálogo cambia después), y **reserva de stock con expiración** según la skill de carrito (sección 7).
- Pantalla de resumen final con botón "Pagar" que, hasta que exista el módulo 07, lleva a una pantalla interna de "método de pago próximamente". Página "Mis pedidos" (04) ya muestra órdenes reales con su estado.

**Queda fuera:** todo contacto con la pasarela de pago, confirmación de compra y correos de confirmación de pago (07); emisión FEL (07); cotizaciones (10); envío internacional (fase 2).

## 3. Dependencias

- **05 Carrito** — la orden nace de un carrito válido.
- **04 Cuentas de usuario** — checkout con sesión y la infraestructura para asociar orden ↔ cuenta (el flujo de invitado también la usa para ofrecer crear cuenta al final).

## 4. Skills involucradas

- `retail-cart-checkout` — cálculo de totales (2), métodos de envío (3), flujo por pasos (4), invitado vs. registrado (5), cupones (6), reserva de stock (7), creación de la orden (8).
- `retail-backend-api-admin` — endpoints de órdenes, validación de entrada, transaccionalidad de la creación de orden + reserva.
- `retail-ux-design-system` — visual del flujo (4.6), estados de error de formularios (7).

## 5. Listo cuando…

- [ ] En staging, un invitado completa el flujo entero desde el carrito y obtiene número de orden; un usuario con sesión lo completa con dirección y NIT precargados sin re-escribirlos.
- [ ] La orden creada aparece en "Mis pedidos" (usuario) y en la base con snapshot completo: cambiar el precio del producto en el catálogo después NO altera la orden existente.
- [ ] Al crear la orden, el stock de las variantes queda reservado: otro navegador que intente comprar la última unidad reservada es informado de no disponibilidad.
- [ ] Una orden no pagada expira su reserva en el tiempo configurado y el stock vuelve a estar disponible (verificable acelerando el tiempo de expiración en staging).
- [ ] Elegir método de envío distinto cambia el total correctamente; una dirección de un municipio sin cobertura (si aplica) lo indica antes del resumen, no después.
- [ ] Datos inválidos (NIT malformado, teléfono incompleto, paso saltado por URL) son rechazados con mensajes en el campo correspondiente; es imposible crear una orden con carrito vacío o precios manipulados desde el cliente.

## 6. Riesgos y decisiones pendientes (preguntar ANTES de construir)

- **Política de envíos (bloqueante):** ¿transportista(s) — Guatex, Cargo Expreso, Forza, mensajería propia en la capital? ¿Tarifa plana, por departamento, o por peso/tamaño (relevante: ollas y cristalería pesan y se quiebran)? ¿Envío gratis a partir de cierto monto? ¿Recoger en tienda existe?
- **Tiempo de expiración de la reserva de stock:** proponer 60 minutos; confirmar con el dueño.
- **Cupones/descuentos en fase 1:** la skill los contempla; confirmar si se lanzan con el sitio o post-lanzamiento (recomendación: post-lanzamiento, para no engordar este módulo).
- **Política de devoluciones y garantías:** debe existir como texto legal visible en el checkout (electrodomésticos implican garantía). Pedirla al dueño; su ausencia no bloquea la construcción pero sí el lanzamiento (09).
- **Cristalería frágil:** ¿costo extra de embalaje o política de daños en tránsito? Afecta texto del checkout y costos de envío.
