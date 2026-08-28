# Módulo 10 — Cotizaciones: venta sin cobro en línea (transferencia / link de pago)

## 1. Nombre y objetivo

**Cotizaciones.** Permitir cerrar ventas fuera del cobro en línea: el cliente solicita una cotización, el negocio la envía y da seguimiento por estados, y el pago llega por transferencia bancaria o link de pago — con confirmación **manual** desde el admin. Es además la mecánica de pedido que heredará el portal mayorista (11).

## 2. Alcance funcional

**Incluye:**

- **Solicitud de cotización desde el carrito:** junto a "Proceder al checkout" aparece "Solicitar cotización"; captura datos de contacto (nombre, correo, teléfono, NIT opcional) y convierte el carrito en una cotización con número propio (ej. `COT-2026-00001`), sin exigir cuenta.
- **Ciclo de vida con estados:** `requested → sent → accepted → pending_payment → paid → converted_to_order`, más `expired` y `rejected`. Cada cambio queda registrado (quién, cuándo, nota).
- **Gestión en el panel admin (extiende el módulo 08):** listar/filtrar cotizaciones, editar líneas y precios (aplicar descuento negociado), fijar vigencia, y enviarla al cliente por correo con PDF adjunto (detalle de productos, precios, vigencia y datos bancarios para transferencia).
- **Cobro manual:** el admin registra el pago recibido (fecha, referencia de transferencia o del link de pago, monto) y **marca la cotización como pagada manualmente**; eso la convierte en orden normal (entra al flujo operativo del 08: preparación, envío, entrega) y descuenta stock en ese momento.
- **Link de pago (opcional según pasarela):** si la pasarela del módulo 07 ofrece links de pago, el admin puede generar uno desde la cotización y enviarlo; aun si el link confirma automático, el estado también puede actualizarse a mano (la vía manual es la garantizada).
- Página pública de consulta de la cotización vía enlace con token (el cliente ve estado, vigencia y detalle sin necesidad de cuenta).
- Notificaciones por correo: al cliente cuando se envía/actualiza la cotización; al admin cuando entra una solicitud.

**Queda fuera:** precios mayoristas automáticos y cuentas B2B (11), pagos en línea directos (ya existen en 07), y cualquier facturación FEL automática — la factura de una cotización pagada se emite reutilizando el mecanismo del 07 al convertirse en orden (confirmar en punto 6).

## 3. Dependencias

- **06 Checkout** — reutiliza la estructura de orden, snapshot de precios y datos de envío.
- **08 Panel de administración** — la gestión vive dentro del admin. (No depende del 07 para funcionar: la vía transferencia + confirmación manual es autónoma; el link de pago es un extra si 07 lo permite.)

## 4. Skills involucradas

- `retail-cart-checkout` — reutilización del modelo de carrito→documento (secciones 1, 2, 8); la cotización es una variante de orden con ciclo propio.
- `retail-backend-api-admin` — endpoints y pantallas admin de cotizaciones, auditoría de cambios de estado (9).
- `retail-payments-integration` — solo la parte de links de pago (8) y la frontera con FEL (7).
- `retail-ux-design-system` — formulario de solicitud y página pública de consulta con los componentes existentes.

## 5. Listo cuando…

- [ ] En staging: un visitante con carrito solicita cotización, el admin la recibe (correo + panel), edita un precio, fija vigencia de 15 días y la envía; el cliente recibe correo con PDF y datos bancarios, y su enlace público muestra el detalle.
- [ ] El admin registra un pago por transferencia con número de referencia → la cotización pasa a `paid`, se convierte en orden visible en el flujo de pedidos, y el stock se descuenta en ese momento (no antes).
- [ ] Una cotización vencida pasa a `expired` automáticamente y su enlace público lo indica; no puede marcarse pagada sin reactivarla explícitamente.
- [ ] Todo cambio de estado muestra en el detalle quién lo hizo, cuándo y la nota/referencia.
- [ ] Intentar convertir a orden una cotización cuyos productos ya no tienen stock alerta al admin y no deja la venta en estado inconsistente.
- [ ] El stock NO se reserva al solicitar cotización (a diferencia del checkout) — verificable: cotizar no altera la disponibilidad pública. (Decisión deliberada: las cotizaciones pueden quedar abiertas semanas.)

## 6. Riesgos y decisiones pendientes

- **Datos bancarios para transferencia:** cuentas y nombre exactos a incluir en el PDF — proporcionados por el dueño.
- **Vigencia por defecto de la cotización:** proponer 15 días; confirmar.
- **FEL sobre cotizaciones pagadas:** ¿se factura automáticamente al marcar pagada (recomendado, reutilizando 07), o el negocio factura por fuera? Confirmar antes de construir la conversión a orden.
- **¿Quién aprueba/gestiona cotizaciones?** Si habrá vendedores dedicados, puede justificar el rol "operador" del módulo 08.
- **Riesgo operativo del cobro manual:** un pago marcado por error no tiene vuelta automática — por eso el criterio de auditoría es obligatorio y conviene doble confirmación en la UI ("¿Confirmas que recibiste Q X por transferencia ref. Y?").
