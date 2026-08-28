# Módulo 07 — Cobro en línea, FEL y confirmación de compra

## 1. Nombre y objetivo

**Pagos.** Cobrar la orden en línea con tarjeta a través de la pasarela elegida, confirmar la compra al cliente y emitir la factura electrónica (FEL) — el paso que convierte el sitio en un negocio.

## 2. Alcance funcional

**Incluye:**

- Integración con la pasarela de pago elegida (ver punto 6 — decisión bloqueante): creación del intento de pago desde la orden `pending_payment`, redirección o formulario embebido según la pasarela, y manejo de resultado.
- **Webhooks como fuente de verdad** del estado de pago (según la skill de pagos, sección 5): idempotentes, verificados por firma; la redirección del navegador nunca es la que confirma la orden.
- Máquina de estados de la orden respecto a pago: `pending_payment → paid | failed | expired`, con reintento de pago sobre la misma orden en caso de fallo, y liberación de reserva al expirar.
- Confirmación de compra: pantalla de éxito con resumen y número de orden, y correo de confirmación al cliente (reutiliza el proveedor de correo del módulo 04).
- **FEL:** emisión de la factura electrónica al confirmarse el pago, vía certificador autorizado SAT, con el NIT/CF capturado en el checkout; entrega del PDF/XML al cliente por correo y descargable desde "Mis pedidos". Manejo de fallo de emisión sin bloquear la venta (reintento en cola + alerta al admin).
- Descuento definitivo de stock al confirmarse el pago (la reserva del 06 se consuma).

**Queda fuera:** gestión de pedidos por el admin (08), reembolsos/contracargos operativos (la skill de pagos los cubre; se implementa la base técnica solo si la pasarela elegida lo facilita — confirmar alcance), cotizaciones y pagos por transferencia (10), y métodos de pago alternativos como contra entrega (decisión pendiente, punto 6).

## 3. Dependencias

- **06 Checkout** — la orden formal con totales y reserva es el insumo del cobro. (Frontera estricta de la skill maestra: 06 arma y valida la orden; 07 solo la cobra y actualiza su estado.)

## 4. Skills involucradas

- `retail-payments-integration` — decisión de pasarela (1), arquitectura (2), flujo de cobro (3), estados de pago (4), webhooks (5), reembolsos (6), FEL (7), métodos adicionales (8).
- `retail-cart-checkout` — solo para respetar la frontera con la orden y la consumación de la reserva de stock.
- `retail-backend-api-admin` — seguridad de endpoints de pago, logging de eventos de pago.

## 5. Listo cuando…

- [ ] En staging con el sandbox de la pasarela: pago aprobado deja la orden en `paid`, muestra pantalla de éxito, envía correo de confirmación y descuenta stock definitivo.
- [ ] Pago rechazado (tarjeta de prueba de fondos insuficientes) deja la orden en estado reintentable, conserva la reserva, y el cliente puede pagar de nuevo sin crear otra orden.
- [ ] Cerrar el navegador tras pagar (sin ver la pantalla de éxito) igual confirma la orden vía webhook — verificable simulando el webhook sin redirección.
- [ ] El mismo webhook recibido dos veces no duplica confirmación, correo ni descuento de stock (idempotencia demostrable).
- [ ] Un webhook con firma inválida es rechazado y queda registrado en logs.
- [ ] La factura FEL de una compra de prueba se emite, llega por correo con PDF, es consultable en el portal de la SAT (ambiente de pruebas del certificador) y muestra NIT y montos correctos; una compra "CF" también factura correctamente.
- [ ] Ninguna llave de pasarela ni certificador aparece en el frontend ni en el repositorio (verificable por búsqueda en el código).

## 6. Riesgos y decisiones pendientes (BLOQUEANTES — resolver antes de iniciar)

- **Pasarela de pago (aún no decidida):** evaluar con el dueño entre opciones activas en Guatemala (Recurrente, Pagalo/Visanet, NeoNet/Cybersource, u otra que tenga negociada con su banco) con estos criterios: comisión por transacción, soporte de webhooks confiables, liquidación en GTQ a banco local, antifraude/3DS, tiempo de alta del comercio y calidad de documentación. **El alta del comercio en la pasarela puede tardar semanas — iniciar el trámite comercial mientras se construyen los módulos 04–06.**
- **Certificador FEL:** elegir (Infile, Digifact, Megaprint, etc.) según costo por DTE y disponibilidad de API + ambiente de pruebas. También requiere trámite previo (afiliación como emisor FEL ante SAT) — iniciarlo temprano.
- **Cuotas:** ¿se ofrecerán pagos en cuotas (Visacuotas etc.)? Depende de la pasarela; preguntar al dueño.
- **Pago contra entrega:** común en GT; decidir si se ofrece (afecta flujo del 06 y logística). Recomendación: no en el lanzamiento, evaluar después — pero es decisión del dueño.
