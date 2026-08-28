---
name: retail-payments-integration
description: Integración con la pasarela de pago en línea de la tienda de hogar — cobro de tarjetas, tokenización segura, webhooks de confirmación, estados de pago, reembolsos y facturación electrónica (FEL en Guatemala). Úsala SIEMPRE que se trabaje en cobrar una orden, conectar con un proveedor de pagos (QPayPro, Recurrente, Pagalo, VisaNet/NeoLink, BAC Credomatic, etc.), procesar un webhook de confirmación de pago, manejar reembolsos, o emitir factura electrónica. NO la uses para calcular totales del carrito, armar la orden o gestionar envío (usa retail-cart-checkout, que entrega la orden ya lista antes de llegar aquí), ni para la gestión posterior del pedido ya pagado como cambios de estado a enviado/entregado (usa retail-backend-api-admin) — esta skill solo cobra la orden y reporta el resultado.
---

# Retail Hogar E-commerce — Integración de Pagos

Esta skill cubre exclusivamente el cobro de una orden ya armada por `retail-cart-checkout`. Recibe una orden en estado `pendiente_pago` con su total ya calculado y validado en servidor, la cobra a través de la pasarela elegida, y reporta el resultado. No recalcula totales, no valida stock, no arma la orden.

**Principio no negociable:** este proyecto **nunca** maneja ni almacena datos de tarjeta (número, CVV, fecha de expiración) en sus propios servidores. Todo dato sensible de pago se captura y procesa a través de la interfaz segura (hospedada o tokenizada) del proveedor de pagos — esto reduce drásticamente el alcance de cumplimiento PCI-DSS del proyecto.

---

## 1. Decisión de pasarela de pago (confirmar con el usuario — hay varias opciones activas para Guatemala)

| Proveedor | Perfil | Notas |
|---|---|---|
| **QPayPro** | Pasarela guatemalteca orientada a PYMEs, sin costo mensual en plan inicial, integraciones listas para plataformas de ecommerce comunes | Buena opción para lanzar rápido con comisión por transacción, sin cuota fija |
| **Pagalo** | Fintech guatemalteca, incluye pasarela de pago y facturación electrónica (FEL) integrada | Interesante porque resuelve pago + FEL en un mismo proveedor (ver sección 7) |
| **Recurrente** | Fuerte en pagos recurrentes/suscripciones, sin costo de afiliación, integración simple | Menos relevante si el modelo es 100% compra única, útil si en el futuro se agregan membresías o compras recurrentes |
| **NeoLink (VisaNet)** | Opción institucional, alta estabilidad, orientada a empresas con volumen alto | Proceso de afiliación más formal; buen fit si el negocio ya opera con VisaNet en otros canales |
| **BAC Credomatic** | Banco con pasarela propia, respaldo institucional fuerte | Proceso de afiliación bancario tradicional |
| **PayPal** | Reconocimiento global, útil si hay clientela que prefiere pagar así o compradores fuera de Guatemala | Generalmente como método adicional, no único |

**Recomendación por defecto para el lanzamiento:** una pasarela guatemalteca sin cuota mensual y con integración API directa (QPayPro o Pagalo) para minimizar fricción de arranque, evaluando en el futuro sumar NeoLink/BAC Credomatic si el volumen de ventas lo justifica y se busca mayor respaldo institucional. **Esta decisión debe confirmarse con el usuario** porque afecta comisiones, tiempos de liquidación (usualmente 24–48h hábiles) y requisitos de afiliación (Patente de Comercio, RTU digital, cuenta bancaria local — trámite que el usuario gestiona directamente con el proveedor, no algo que esta skill resuelva).

Toda la arquitectura de esta skill (secciones siguientes) está pensada para ser **agnóstica al proveedor** dentro de lo posible — la lógica de estados, webhooks y reembolsos es la misma; solo cambia el SDK/cliente HTTP específico.

---

## 2. Arquitectura de la integración

```
retail-cart-checkout                    retail-payments-integration                Pasarela de pago
       │                                          │                                       │
       │  orden creada (pendiente_pago)           │                                       │
       ├─────────────────────────────────────────►│                                       │
       │                                          │  crea intento de pago / sesión         │
       │                                          ├──────────────────────────────────────►│
       │                                          │  (checkout hospedado o token de tarjeta)│
       │                                          │◄──────────────────────────────────────┤
       │                                          │                                       │
       │                                          │        webhook de confirmación         │
       │                                          │◄──────────────────────────────────────┤
       │                                          │  actualiza estado de la orden          │
       │◄─────────────────────────────────────────┤                                       │
```

- Módulo dedicado `services/payments/` en el backend (`retail-backend-api-admin`), con un adaptador por proveedor (`qpayproAdapter.ts`, `pagaloAdapter.ts`, etc.) detrás de una interfaz común (`createPaymentIntent`, `verifyWebhookSignature`, `refundPayment`) — así cambiar de proveedor o agregar uno adicional no obliga a reescribir el resto del sistema.

---

## 3. Flujo de cobro

1. `retail-cart-checkout` entrega `order_id` con total ya validado.
2. Esta skill crea un intento/sesión de pago en la pasarela, usando **checkout hospedado** (redirección a la página segura del proveedor) o **campos tokenizados embebidos** (SDK JS del proveedor captura los datos de tarjeta sin que pasen por el servidor propio) — la opción exacta depende del proveedor elegido, pero el principio de "nunca tocar el dato crudo de tarjeta" es fijo.
3. El usuario completa el pago en la interfaz del proveedor.
4. El proveedor notifica el resultado por **webhook** (fuente de verdad) y, en paralelo, redirige al usuario a una página de resultado (`/checkout/confirmacion`) — esta redirección es solo para UX, nunca se confirma un pago basándose únicamente en el redirect del navegador, que puede manipularse o interrumpirse.
5. Al recibir el webhook, esta skill actualiza el estado de la orden y libera/descuenta el inventario reservado según corresponda (coordinado con `retail-cart-checkout`, sección 7 de esa skill).

---

## 4. Estados de pago

```
pendiente → autorizado → capturado (pagado)
                │
                └──► fallido / rechazado

capturado → reembolsado (total o parcial)
capturado → contracargo (disputa iniciada por el banco emisor)
```

- **Autorizado ≠ Capturado:** algunos proveedores separan la autorización (fondos retenidos) de la captura (cobro efectivo). Si el proveedor elegido lo soporta, definir con el usuario si se captura automáticamente o se retiene hasta confirmar el pedido (relevante si hay productos que requieren verificación de stock físico antes de cobrar).
- El estado de pago se refleja en `orders.estado`: `pendiente_pago` → `pagado` (o `pago_fallido` → el carrito puede reintentarse o expirar según la regla de `retail-cart-checkout`).

---

## 5. Webhooks — manejo correcto (crítico)

- **Verificación de firma:** todo webhook entrante se valida con la firma/secreto que provee la pasarela antes de procesarlo — nunca confiar en un payload sin verificar, es un vector de fraude directo (alguien podría simular "pago exitoso").
- **Idempotencia:** un mismo evento de webhook puede llegar más de una vez (reintentos del proveedor) — el handler debe ser idempotente (ej. verificar si la orden ya está en estado `pagado` antes de reprocesar) para no duplicar efectos (como descuento de inventario o notificaciones).
- **Respuesta rápida:** responder 200 al proveedor apenas se recibe y encola el evento; el procesamiento pesado (actualizar orden, notificar, etc.) puede ir en un job asíncrono si el volumen lo justifica — proveedores suelen reintentar agresivamente si no reciben 200 a tiempo.
- **Registro de auditoría:** guardar cada evento de webhook recibido (payload, fecha, resultado del procesamiento) en una tabla `payment_events` — indispensable para resolver disputas o depurar pagos fallidos.

---

## 6. Reembolsos y contracargos

- Reembolso (total o parcial) iniciado desde `retail-backend-api-admin` (el panel admin necesita un botón/acción para esto) pero **ejecutado** a través de esta skill, que llama al endpoint de reembolso del proveedor — nunca se marca una orden como reembolsada sin que el reembolso real se haya procesado en la pasarela.
- Al confirmarse un reembolso, actualizar `orders.estado` a `reembolsado` (total) o registrar el monto parcial, y coordinar con inventario si corresponde reponer stock (regla de negocio a confirmar con el usuario: no todo reembolso implica devolución física inmediata del producto).
- Contracargos (disputas del banco emisor) normalmente llegan como notificación aparte del proveedor — esta skill debe exponer un manejo básico (marcar la orden y alertar al admin) aunque la resolución de la disputa en sí es un proceso manual fuera del sistema.

---

## 7. Facturación electrónica (FEL — obligatoria en Guatemala)

En Guatemala, toda venta formal requiere Factura Electrónica en Línea (FEL) certificada ante la SAT. Dos caminos:

- **Proveedor de pago con FEL integrada:** algunos proveedores (ej. Pagalo, según lo confirmado en el paso de decisión de la sección 1) ofrecen emisión de FEL como parte del mismo flujo de cobro — simplifica la integración a un solo proveedor.
- **Certificador FEL independiente:** si la pasarela elegida no incluye FEL, se integra un certificador autorizado por la SAT por separado, disparando la emisión de factura al confirmarse el pago (mismo punto del flujo que la sección 3, paso 5).

**Esta skill no determina el proveedor de FEL** — debe confirmarse con el usuario junto con la decisión de pasarela de pago, ya que ambas decisiones están relacionadas (algunas combinaciones simplifican la arquitectura y otras la duplican). El detalle de campos fiscales requeridos (NIT del cliente, régimen tributario) debe capturarse en el paso de datos del checkout si el negocio decide emitir factura a cada compra por defecto.

---

## 8. Métodos de pago adicionales (evaluar con el usuario)

Más allá de tarjeta de crédito/débito:
- Transferencia bancaria / depósito con confirmación manual (algunas pasarelas guatemaltecas lo ofrecen como método alterno).
- Pago contra entrega (si el modelo logístico del negocio lo soporta) — en este caso la orden se marca `pagado` recién en la entrega, coordinado con `retail-backend-api-admin`, no con esta skill de pago en línea.

---

## 9. Qué NO cubre esta skill

- Cálculo de totales, envío, impuestos o armado de la orden → `retail-cart-checkout` (entrega la orden ya lista antes de que esta skill actúe).
- Reserva/liberación de inventario (esta skill dispara la liberación al confirmar o fallar el pago, pero el modelo de reserva vive en) → `retail-catalog-data-model` y `retail-cart-checkout`.
- Gestión del pedido tras el pago confirmado (cambio a enviado/entregado, reportes) → `retail-backend-api-admin`.
- UI de checkout y formularios visuales de pago → `retail-ux-design-system` y `retail-frontend-react-components` (esta skill define qué datos/flujo debe soportar esa UI, no la construye).
