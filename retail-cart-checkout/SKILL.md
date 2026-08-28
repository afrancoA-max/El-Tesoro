---
name: retail-cart-checkout
description: Lógica funcional del carrito de compras y el flujo de checkout de la tienda de hogar — persistencia del carrito, cálculo de subtotal/envío/impuestos, métodos de envío, checkout de invitado vs. cuenta registrada, validación y reserva de stock, y creación de la orden en estado "pendiente de pago". Úsala SIEMPRE que se trabaje en agregar/editar/eliminar productos del carrito, en los pasos del checkout previos al pago, en cálculo de totales o envío, o en la reserva de inventario al momento de comprar. NO la uses para la integración con la pasarela de pago ni el cobro en sí (usa retail-payments-integration — esta skill entrega una orden lista para cobrar y se detiene ahí), ni para el diseño visual o el código de componentes React (usa retail-ux-design-system y retail-frontend-react-components, que implementan lo que esta skill especifica funcionalmente).
---

# Retail Hogar E-commerce — Carrito y Checkout

Esta skill define el flujo funcional de compra **desde que un producto se agrega al carrito hasta que existe una orden lista para cobrar**. Todo lo que ocurre después (procesar el pago) es responsabilidad exclusiva de `retail-payments-integration`. Esta frontera es intencional y no debe cruzarse: aquí no se integra ninguna pasarela de pago ni se manejan datos de tarjeta.

---

## 1. Persistencia del carrito

- **Usuario invitado (no autenticado):** carrito identificado por un `cart_token` almacenado en cookie o `localStorage`, asociado a un registro de carrito en el backend (no solo en el cliente) — así el carrito sobrevive un refresh y puede recuperarse si el usuario vuelve.
- **Usuario autenticado:** carrito asociado a `user_id`.
- **Merge al iniciar sesión:** si un usuario invitado con carrito activo inicia sesión, el carrito de invitado se fusiona con el carrito existente de su cuenta (si lo hay) — sumar cantidades de productos duplicados, no reemplazar sin avisar.
- El carrito vive en el servidor como fuente de verdad (tabla `carts` / `cart_items`); el estado global de cliente (`retail-frontend-react-components`) es un espejo sincronizado, no la fuente de verdad — evita que el carrito se pierda o desincronice entre dispositivos/pestañas.

### Modelo mínimo de datos del carrito
```
carts: id, user_id (nullable), cart_token (nullable), estado ('activo'|'convertido'|'abandonado'), fecha_actualizacion
cart_items: id, cart_id, variant_id, cantidad, precio_unitario_congelado
```
`precio_unitario_congelado` guarda el precio al momento de agregarlo, para poder detectar y alertar si el precio cambió antes del checkout final.

---

## 2. Cálculo de totales

Fórmula estándar a aplicar en cada actualización del carrito y en el resumen de checkout:

```
Subtotal        = Σ (precio_unitario_actual × cantidad) por cada línea
Descuento       = aplicable por cupón (sección 6) o promoción automática de retail-catalog-data-model (collections)
Costo de envío  = según método elegido (sección 3)
Impuestos       = IVA Guatemala 12% sobre (Subtotal - Descuento), salvo que el negocio indique otro tratamiento fiscal
Total           = Subtotal - Descuento + Costo de envío + Impuestos
```

**Confirmar con el usuario:** si los precios del catálogo ya incluyen IVA (práctica común en Guatemala para retail al consumidor final) o si se calcula aparte — esto cambia la fórmula y debe fijarse una sola vez, no recalcularse distinto en cada pantalla.

Todo cálculo de totales se hace **en el servidor** (nunca confiar en el total calculado por el cliente) — el frontend puede mostrar un cálculo optimista, pero la orden final se valida y recalcula en backend antes de pasar a pago.

---

## 3. Métodos de envío

| Opción | Descripción | Cuándo aplica |
|---|---|---|
| Recogida en tienda/bodega | Costo $0, cliente retira | Si el negocio tiene punto físico |
| Envío estándar a domicilio, tarifa plana | Costo fijo sin importar ubicación dentro de zona de cobertura | Más simple de implementar al inicio — **recomendación por defecto para el lanzamiento** |
| Envío por zona/departamento | Tarifa variable según ubicación (ej. capital vs. interior) | Cuando el negocio tenga acuerdos con transportistas y quiera reflejar el costo real |
| Envío calculado por peso/dimensiones | Usa `peso_kg`/`dimensiones` de `retail-catalog-data-model` | Más preciso pero más complejo — evaluar cuando el volumen de pedidos lo justifique |

El método de envío se selecciona en el paso 3 del checkout (sección 4) y su costo se recalcula en el servidor según las reglas vigentes, nunca confiando en un valor enviado desde el cliente.

---

## 4. Flujo de checkout (pasos)

Corresponde al indicador de progreso visual definido en `retail-ux-design-system`:

1. **Revisión del carrito:** cantidades editables, opción de eliminar, subtotal visible, alerta si algún ítem cambió de precio o se quedó sin stock desde que se agregó.
2. **Datos de envío:** dirección (o selección de "recoger en tienda"), datos de contacto. Usuario invitado puede continuar sin crear cuenta (ver sección 5).
3. **Método de envío:** selección entre las opciones disponibles (sección 3), con costo actualizado en tiempo real.
4. **Revisión final:** resumen completo (productos, subtotal, envío, impuestos, total), aceptación de términos y condiciones.
5. **Creación de la orden:** al confirmar este paso, se crea la orden en estado `pendiente_pago` (sección 7) y se redirige al flujo de `retail-payments-integration` — este es el punto exacto de entrega entre ambas skills.

Cada paso valida antes de permitir avanzar al siguiente (ej. no avanzar a método de envío sin dirección válida).

---

## 5. Checkout de invitado vs. cuenta registrada

- **Checkout de invitado siempre disponible** — exigir cuenta obligatoria antes de comprar reduce conversión en retail. Ofrecer "crear cuenta" como opción, no requisito.
- Al finalizar una compra como invitado, ofrecer la opción de crear cuenta con los datos ya ingresados (un clic, sin re-digitar) para facilitar seguimiento de pedidos futuros.
- Si el usuario elige comprar con cuenta, precargar dirección(es) guardadas previamente.

---

## 6. Cupones y descuentos (confirmar alcance con el usuario)

Si el negocio requiere cupones desde el lanzamiento:
```
coupons: id, codigo, tipo ('porcentaje'|'monto_fijo'), valor, fecha_inicio, fecha_fin, usos_maximos, usos_actuales, monto_minimo_compra
```
- Validación de cupón: vigencia, usos disponibles, monto mínimo — siempre revalidado en servidor al aplicar y de nuevo al confirmar la orden (evita que un cupón expire entre que se aplica y se paga).
- Si el negocio no requiere cupones para el lanzamiento inicial, omitir esta sección del alcance y dejar el modelo preparado para agregarla después sin romper el flujo de checkout.

---

## 7. Validación y reserva de stock durante el checkout

Punto crítico de integridad, coordinado con el modelo de inventario de `retail-catalog-data-model`:

1. Al iniciar el paso de checkout (o al confirmar la revisión del carrito), el backend valida disponibilidad real de cada `variant_id` en el carrito.
2. Si hay disponibilidad, se **reserva** la cantidad: mover de `cantidad_disponible` a `cantidad_reservada` en una transacción atómica — nunca en dos pasos separados que puedan dejar el inventario inconsistente ante concurrencia.
3. La reserva tiene una **expiración** (recomendado: 15 minutos). Si el pago no se confirma en ese plazo (`retail-payments-integration` no reporta éxito), un proceso libera la reserva de vuelta a `cantidad_disponible`.
4. Si algún ítem del carrito ya no tiene stock suficiente al momento de reservar, el checkout se detiene en ese paso con mensaje claro (qué producto, qué cantidad disponible) — nunca permitir avanzar a pago con una orden que luego no se puede cumplir.

---

## 8. Creación de la orden

Al completar el paso 4 del checkout (sección 4):

```
orders: id, user_id (nullable si invitado), cart_id_origen, estado ('pendiente_pago'|'pagado'|'en_preparacion'|'enviado'|'entregado'|'cancelado'),
        subtotal, descuento, costo_envio, impuestos, total, direccion_envio (jsonb), metodo_envio,
        fecha_creacion, fecha_expiracion_reserva
order_items: id, order_id, variant_id, cantidad, precio_unitario_congelado (copiado del carrito, inmutable desde aquí)
```

La orden se crea en estado `pendiente_pago` y se entrega su `id`/referencia a `retail-payments-integration`, que es quien la mueve a `pagado` (o `cancelado` si el pago falla/expira) y desde ahí continúa el ciclo de vida gestionado en `retail-backend-api-admin`.

---

## 9. Qué NO cubre esta skill

- Integración con la pasarela de pago, tokens de tarjeta, webhooks de confirmación → `retail-payments-integration`.
- Diseño visual del carrito/checkout (drawer, indicador de progreso, estilos) → `retail-ux-design-system`.
- Componentes React que implementan estos pasos → `retail-frontend-react-components`.
- Gestión de pedidos ya pagados (cambio de estado a enviado/entregado, reportes) → `retail-backend-api-admin`.
- Estructura de tablas de producto/variante/inventario en sí (esta skill las referencia y las modifica transaccionalmente, pero no las define) → `retail-catalog-data-model`.
