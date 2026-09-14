# Borrador — Sección 8 para `06-checkout.md`

> Redactado el 14-sep-2026 a partir de las decisiones del dueño del proyecto (Andrés). Pegar al final de `docs/plan/06-checkout.md`. Incluye **sustituciones explícitas** a las secciones 2 y 5 del documento vigente: leerlas en 8.1 antes de implementar.

---

## 8. Arquitectura de cobro parametrizable, estados y roles (decisiones del 14-sep — no improvisar)

**Contexto.** El negocio no tendrá cobro en línea al lanzar: no hay contrato con pasarela (Neonet, BAC u otra), no habrá pago contra entrega y no habrá FEL. La venta se cierra por seguimiento humano: el cliente arma su carrito, solicita una cotización, servicio al cliente lo contacta con las indicaciones de pago, y el personal confirma el pago en el panel.

Esta sección deja el Módulo 06 construido de forma que **habilitar una pasarela más adelante sea configuración y un adaptador, no una reescritura**. El adaptador real de la pasarela y FEL siguen siendo alcance del Módulo 07.

### 8.1 Sustituciones al alcance vigente (leer antes de codificar)

| Punto del documento | Qué cambia |
|---|---|
| Sección 2, último viñeta: botón "Pagar" → pantalla "método de pago próximamente" | **No se construye.** El paso final del checkout se llama **"Solicitar cotización"** y crea un documento de cotización (ver 8.4). La pantalla provisional habría sido la experiencia real de producción. |
| Sección 2: "Creación de la orden… estado inicial `pending_payment`" | Sigue vigente **para métodos de tipo pasarela**. Para el método de lanzamiento (`contacto_asesor`) el documento creado es una **cotización**, que se convierte en orden al confirmarse el pago. Lo decide el campo `creaDocumento` del método de pago (8.2). |
| Sección 5, criterio 4: "Una orden no pagada expira su reserva en el tiempo configurado" | **Sustituido.** La expiración pasa a ser propiedad del método de pago. Para `contacto_asesor` la expiración es **nula**: la reserva solo se libera por anulación manual de servicio al cliente (8.5, 8.8). El mecanismo de expiración **sí se construye y se prueba** con un método de prueba que sí tiene TTL, porque los métodos de pasarela lo van a necesitar. |
| `docs/plan/10-cotizaciones.md`, sección 5, último criterio: "El stock NO se reserva al solicitar cotización" | **Queda en conflicto con esta decisión.** Aquí la cotización confirmada **sí reserva**. Al llegar al Módulo 10 hay que alinear ese punto: la cotización nacida del carrito reserva; una cotización creada o editada a mano por un vendedor (alcance del 10) puede no reservar. Anotado para no descubrirlo tarde. |

**Qué se adelanta del Módulo 10 y qué no.** Del 10 sube al lanzamiento únicamente: solicitud de cotización desde el carrito, reserva, confirmación manual de pago, anulación, y conversión a orden. **Queda en el 10** todo lo demás: edición de líneas y precios negociados por el admin, vigencia, PDF adjunto, enlace público con token, y las notificaciones ampliadas al cliente.

### 8.2 Registro de métodos de pago (los métodos son datos, no `if`s)

Tabla `payment_methods`. Ningún flujo del checkout debe preguntar "¿ya tenemos pasarela?" en código: pregunta a esta tabla.

| Campo | Tipo | Para qué |
|---|---|---|
| `codigo` | string único | `contacto_asesor`, `transferencia`, `tarjeta_neonet`, `link_pago`, `contra_entrega`, `tarjeta_mock` |
| `nombre` / `descripcion` | texto | Lo que ve el comprador |
| `tipo` | enum | `manual_offline` \| `transferencia` \| `gateway` \| `contra_entrega` |
| `habilitado` | bool | Lo controla el superadmin (8.9) |
| `orden` | int | Orden de presentación |
| `creaDocumento` | enum | `cotizacion` \| `orden` — **este campo es el que cambia el flujo cuando entre Neonet** |
| `reservaStock` | bool | Si el documento creado reserva inventario |
| `ttlReservaMinutos` | int nullable | `null` = sin expiración automática (solo anulación manual) |
| `requiereConfirmacionManual` | bool | `true` = un humano marca pagado; `false` = lo hace el webhook |
| `proveedor` | string nullable | Clave del adaptador (8.3). `null` para métodos manuales |
| `instruccionesPago` | texto rico | Editable por el cliente (cuenta bancaria, pasos). Vacío al lanzar |

**Semilla obligatoria de la migración:**

| código | tipo | habilitado | creaDocumento | reservaStock | ttlReserva | confirmManual | proveedor |
|---|---|---|---|---|---|---|---|
| `contacto_asesor` | manual_offline | **sí** | cotizacion | sí | `null` | sí | — |
| `transferencia` | transferencia | no | cotizacion | sí | `null` | sí | — |
| `tarjeta_neonet` | gateway | no | orden | sí | 60 | no | `neonet` |
| `link_pago` | gateway | no | cotizacion | sí | `null` | sí | *(por definir)* |
| `contra_entrega` | contra_entrega | no | orden | sí | `null` | sí | — |
| `tarjeta_mock` | gateway | solo staging | orden | sí | 60 | no | `mock` |

Con esta tabla, el día que exista Neonet el cambio es: habilitar la fila, cargar el adaptador, deshabilitar `contacto_asesor` (o dejar ambos). Sin tocar el checkout.

### 8.3 Puerto de pagos (`PaymentProvider`)

Interfaz mínima en `backend/src/services/payments/`, con tres implementaciones desde el 06:

```ts
interface PaymentProvider {
  crearIntento(doc: DocumentoCobrable): Promise<IntentoPago>   // url de redirección o null
  consultarEstado(intentoId: string): Promise<EstadoPago>
  procesarWebhook(payload: unknown, firma: string): Promise<EventoPago>
}
```

- **`ManualProvider`** — no hace nada: el documento queda esperando confirmación humana. Es el que corre en producción al lanzar.
- **`MockProvider`** — simula aprobado / rechazado / webhook duplicado. Permite probar en staging **hoy** todo el flujo de pasarela.
- **`NeonetProvider`** *(Módulo 07)* — se escribe cuando existan credenciales y sandbox. **No se especula ahora**: sin documentación real, cualquier adaptador escrito por adelantado se tira.

Regla: el checkout y el servicio de órdenes hablan solo con la interfaz. Ningún nombre de pasarela aparece fuera de su propio adaptador.

### 8.4 Estados y transiciones — dos documentos, un solo motor

**Cotización** (`COT-2026-00001`):

```
solicitada ──(cliente confirma)──► confirmada ──(personal confirma pago)──► pagada ──► convertida_en_orden
                                       │
                                       └──(personal anula)──► anulada
```

**Orden** (`ELT-2026-00001`) — nace de una cotización pagada, o directo del checkout con método de pasarela:

```
pendiente_pago ──(pago confirmado)──► pagada ──(personal despacha)──► despachada ──► entregada
      │                                   │
      └──(anulada / expirada)             └──(anulada)
```

Enum completo desde ahora, aunque varios valores no se usen al lanzar: `solicitada | confirmada | pendiente_pago | pagada | convertida_en_orden | despachada | entregada | anulada | expirada | fallida`. Agregar valores después es barato; reescribir la UI y los servicios que asumieron dos estados, no.

**Las dos acciones del panel** (una por transición, nunca combinadas):

1. **Confirmar pago** — pide fecha, referencia y monto; convierte la cotización en orden; consume la reserva (8.5); registra el pago (8.6) y el evento (8.7).
2. **Procesar envío** — marca despachada; opcionalmente número de guía y transportista.

**Regla de oro:** el consumo de la reserva ocurre en la transición *"pago confirmado"*, sin importar el origen. Un único método `confirmarPago(documento, { origen: 'manual' | 'webhook', referencia, monto, usuario })`. Cuando entre Neonet, el webhook llama exactamente a ese método — por eso no hay dos flujos de inventario que mantener, solo dos disparadores.

### 8.5 Efectos sobre el inventario (todo en transacción, usando `stockVendible()` de 7.2)

| Transición | `cantidadDisponible` | `cantidadReservada` |
|---|---|---|
| Cotización confirmada (o orden creada con método que reserva) | − cantidad | + cantidad |
| **Pago confirmado** (manual o webhook) | sin cambio | **− cantidad** (baja definitiva; no regresa a disponible) |
| Anulada por el personal | **+ cantidad** | − cantidad |
| Expirada (solo métodos con `ttlReservaMinutos`) | + cantidad | − cantidad |

Nunca en dos sentencias separadas. El trigger de Postgres que mantiene `Product.disponible` (migración `20260914090000_nuevo01_trigger_agregados_producto`) refleja el cambio en catálogo, ficha, búsqueda y colecciones sin tocar endpoint por endpoint.

### 8.6 Registro de pagos (`payments`)

Tabla propia desde el inicio, **no un campo `pagado` en el documento**:

`id`, `documentoTipo` (`cotizacion`|`orden`), `documentoId`, `monto` (texto decimal fijo, `money.ts`), `moneda`, `metodoCodigo`, `referencia` (transferencia / autorización), `fechaPago`, `registradoPor` (usuario o `webhook`), `origen` (`manual`|`webhook`), `externalId` (único, nullable — idempotencia de webhooks), `notas`.

**Fase 1: un solo pago que cubre el total.** El servicio rechaza un monto distinto al total. Habilitar abonos después es quitar esa validación y sumar `payments`, no migrar datos históricos.

`externalId` único se crea ahora aunque nadie lo use: es lo que hace que el mismo webhook recibido dos veces (Módulo 07) no duplique nada, y una bitácora retroactiva no existe.

### 8.7 Bitácora (`document_events`)

Obligatoria por el riesgo del cobro manual: `documentoTipo`, `documentoId`, `estadoAnterior`, `estadoNuevo`, `usuarioId`, `fecha`, `nota`. Todo cambio de estado escribe una fila. El detalle del documento muestra quién hizo qué y cuándo.

**Confirmación de pago con doble confirmación en la UI**: "¿Confirmás que se recibió Q X por referencia Y?" — un pago marcado por error no tiene vuelta automática.

### 8.8 Pendientes visibles (sustituye a la expiración automática)

Como la reserva del método de lanzamiento **no expira sola**, la disciplina operativa es lo único que evita inventario bloqueado. Por eso el 06 entrega:

- **Al ingresar al panel:** resumen con dos contadores — *pendientes de confirmar pago* y *pendientes de despachar* — con enlace directo al listado filtrado.
- **En el listado de cotizaciones y pedidos:** los pendientes van identificados y ordenados por antigüedad, con marca de tiempo por umbral configurable (propuesta: ámbar > 24 h, rojo > 72 h). Filtro rápido "solo pendientes".
- **Badge con conteo** en el menú lateral, visible en todas las pantallas del panel.
- **Correo resumen diario** al personal con los pendientes (activable/desactivable en ajustes).
- Umbrales y correo diario son ajustes de plataforma (8.9).

### 8.9 Niveles de configuración y roles

Tres niveles, tres audiencias:

| Nivel | Dónde vive | Quién lo toca | Qué contiene |
|---|---|---|---|
| **Secretos** | GCP Secret Manager / variables de entorno | Solo DIGINET | Llaves de pasarela, credenciales de certificador FEL. Nunca en pantalla, nunca en el repositorio |
| **Ajustes de plataforma** (`scope: 'platform'`) | Tabla `settings` | Rol **`superadmin`** (DIGINET) | Habilitar/deshabilitar métodos de pago, `ttlReservaMinutos`, modo sandbox, umbrales de alerta, correo diario |
| **Ajustes de negocio** (`scope: 'business'`) | Tabla `settings` | Rol **`admin`** (cliente) | Datos bancarios, texto de instrucciones de pago, tarifas de envío, vigencias, textos legales |

**Jerarquía de roles:** `superadmin` (DIGINET) > `admin` (cliente) > `staff` (personal de almacén).

Definir `superadmin` **ahora**, en el 06: el Módulo 04 ya creó la infraestructura de roles y el 08 la va a consumir. Meter un nivel por encima cuando el panel ya existe y el cliente ya tiene usuarios obliga a tocar muchas pantallas.

**Permisos nombrados desde el inicio** — `cotizaciones.confirmar_pago`, `pedidos.despachar`, `catalogo.editar`, `ajustes.plataforma`, `ajustes.negocio`. Decisión del 14-sep: en fase 1 el rol `staff` tiene **tanto** `confirmar_pago` como `despachar` (cualquier usuario del panel puede hacer ambas). Si más adelante se quiere separar funciones sobre el dinero, es cambiar la asignación del rol — no código.

**Regla de aislamiento:** un usuario `admin` del cliente no debe ver los ajustes `scope: 'platform'` ni siquiera deshabilitados, y la API debe rechazarlos aunque se llame directamente. Ocultarlos solo en la UI no cuenta.

### 8.10 Explícitamente fuera del Módulo 06

Adaptador real de pasarela, webhooks de producción, FEL, reembolsos, cuotas, generación de links de pago, contra entrega, y del Módulo 10: edición de precios negociados, PDF de cotización, vigencia y enlace público con token.

### 8.11 Criterios de aceptación adicionales (se suman a la sección 5)

- [ ] En staging, un visitante arma carrito, solicita cotización como invitado y recibe número `COT-2026-…`; el stock reservado se refleja de inmediato en catálogo, ficha y búsqueda.
- [ ] El personal confirma el pago con referencia y monto: la cotización pasa a `pagada`, se crea la orden `ELT-2026-…`, y la cantidad sale de `cantidadReservada` **sin** regresar a `cantidadDisponible`.
- [ ] Confirmar pago dos veces (doble clic, dos pestañas, dos usuarios a la vez) no descuenta stock dos veces ni crea dos órdenes.
- [ ] Anular una cotización devuelve exactamente la cantidad reservada a disponible, y el documento anulado no puede pasar a pagado sin reactivarse explícitamente.
- [ ] La bitácora del documento muestra quién confirmó el pago, cuándo, con qué referencia y qué nota.
- [ ] Al ingresar al panel, el personal ve los contadores de pendientes; una cotización de más de 72 h aparece marcada en el listado.
- [ ] **Prueba de no-retrabajo:** habilitando `tarjeta_mock` en staging, el mismo carrito produce una **orden** (no cotización), reserva 60 minutos, y el webhook simulado la deja `pagada` sin intervención humana — demostrando que el cambio de flujo es de configuración, no de código.
- [ ] Deshabilitar todos los métodos de pasarela devuelve el sitio al flujo de cotización sin desplegar nada.
- [ ] Un usuario con rol `admin` (cliente) no puede leer ni escribir ajustes `scope: 'platform'` — verificable llamando la API directamente, no solo por la UI.
- [ ] Ninguna llave ni nombre de pasarela aparece fuera de su adaptador (verificable por búsqueda en el código).
