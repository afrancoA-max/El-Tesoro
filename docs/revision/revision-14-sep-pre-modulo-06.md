# Revisión de seguimiento — 14 de septiembre de 2026

**Pregunta:** ¿está todo bien para pasar al Módulo 06 (checkout)?
**Respuesta corta:** sí, después de un lote corto de arreglos (Lote G) y de comprobar 3 cosas en staging. La calidad del trabajo aplicado desde el 11-sep es alta: casi todo el informe anterior quedó resuelto, y bien resuelto.

**Alcance de esta revisión:** lectura completa de los archivos en disco (backend, frontend, shared, migraciones, scripts, workflows). No pude consultar el estado de git ni de las corridas de CI desde aquí, así que los puntos que dependen de "está commiteado / desplegado" quedan como comprobación tuya.

---

## 1. Qué quedó corregido (verificado en el código)

| Grupo | Resueltos | Observación |
|---|---|---|
| Seguridad (SEG) | 10 de 11 | Falta solo SEG-10 (escape de JSON-LD), de prioridad baja |
| Carrito (CAR) | 12 de 12 | CAR-13 era una nota para el 06 — ver `NUEVO-02` |
| Catálogo (CAT) | 10 de 10 | — |
| UX | 4 de 4 | — |
| Infraestructura (INF) | 6 de 10 | Los 4 restantes van con la migración de GCP |

Lo más importante, con nombre y apellido:

- **El secreto JWT ya no tiene valor de respaldo en producción** y exige 32 caracteres; `CORS_ORIGINS` tampoco acepta `*` en producción (el servidor no arranca si está mal configurado, que es justo lo que se busca).
- **Los logs ya no guardan cookies ni tokens** (`redact` en pino).
- **Rol `staff`** creado con su migración: el personal de tienda ya no necesita ser administrador.
- **El carrito ya no "desaparece"** cuando vence la sesión: el backend avisa con el header `X-Access-Token-Expired`, el cliente HTTP unificado refresca y reintenta, y la cookie del access token ahora vive tanto como el refresh (que es lo que hace posible detectar la expiración).
- **Sincronización entre pestañas** con `BroadcastChannel` más recarga al volver a la pestaña: el criterio del checklist del Módulo 05 que faltaba.
- **Selector de cantidad** en la ficha y en el carrito, con aviso visible cuando el stock recorta lo pedido; el backend ahora devuelve `limitado` también al cambiar cantidades.
- **Combinación de variantes inexistente**: ya no agrega otra variante por error; las opciones que no combinan salen deshabilitadas.
- **Dinero en centavos enteros** (`shared/src/money.ts`) para el carrito, con la regla escrita en `docs/plan/06-checkout.md`.
- **Productos en borrador ya no responden 200**, y las variantes inactivas no llegan a la ficha.
- **Listados en SQL** con columnas desnormalizadas (`precioDesde`, `disponible`) y endpoint propio de facetas: se acabó el "cargar toda la categoría en memoria".
- **Banners administrables** por tabla + script `manage-banners`, con respaldo automático si no hay ninguno activo.
- **Sitemap** desde el backend, con todas las categorías con productos y todos los productos activos con su fecha real.
- **Teléfono con guion aceptado** (normalizador compartido), páginas estáticas creadas (envíos, devoluciones, contacto, sobre nosotros, mayorista, privacidad) y enlace a privacidad en el registro.
- **Pruebas de integración** (auth, carrito, direcciones) contra un Postgres real en CI, y el despliegue ahora espera a que el CI y las pruebas estén en verde.
- **helmet** en la API, cabeceras de seguridad en Next, `/dev/design` bloqueado en producción, `/staff` con noindex, y `/api/health` que sí consulta la base.

---

## 2. Pendiente a propósito (no bloquea el Módulo 06)

- **Migración a GCP** (`OPS-00`) y con ella `INF-01` (base local para desarrollo), `INF-02` (cuenta de servicio de runtime) e `INF-05` (remitente de correo con dominio propio). Recuerda la fecha: la instancia de prueba deja de responder alrededor del **27-sep**.
- **Importador y datos** (`IMP-01` a `IMP-04`): esperan el catálogo real. Cuando llegue, corrige **antes de importar** que el importador sigue identificando cada producto por su **número de fila** en el Excel.
- **SEG-10**: los bloques JSON-LD no escapan `<`. Riesgo real solo cuando exista el panel admin (Módulo 08) y alguien pueda escribir nombres de producto.

---

## 3. Hallazgos nuevos de esta revisión

### NUEVO-01 [ALTO — arreglar antes del 06] Las columnas desnormalizadas solo las mantiene el importador

`products.precioDesde` y `products.disponible` se escriben en `import-catalog.ts` y en el backfill, y nadie más las toca. El Módulo 06 va a **reservar stock** (y el 08 va a editar precios): en cuanto una compra deje una variante en cero, el listado de categoría seguirá mostrando ese producto como disponible y el filtro "solo disponibles" mentirá hasta la próxima importación.

*Corrección:* una función única (por ejemplo `refreshProductAggregates(productId)`) que recalcule ambas columnas, llamada desde **todo** lo que cambie inventario o precio de variante — reservas, liberaciones, confirmación de pedido, importador y futuro panel admin. Alternativa más robusta: un trigger en Postgres sobre `inventory` y `product_variants`.

### NUEVO-02 [ALTO — arreglar antes del 06] Las notas CAR-13 no llegaron al plan del Módulo 06

`docs/plan/06-checkout.md` recogió la regla del dinero, pero no las dos decisiones de modelo que el 06 necesita:

1. `Cart.userId` es `@unique` y `findCartId` no filtra por `estado`. Cuando el checkout marque el carrito como `convertido`, el usuario seguirá viendo ese carrito (o no podrá tener otro). Hay que decidir: vaciar y reutilizar, o quitar el `unique` y buscar siempre el carrito `activo`.
2. Definir **"stock vendible" = `cantidadDisponible` − `cantidadReservada`** en un solo helper que usen carrito, ficha, listados y checkout. Hoy el carrito valida solo contra `cantidadDisponible`; en cuanto existan reservas, dos clientes podrán llevarse la misma última unidad al carrito.

### NUEVO-03 [MEDIO] Tipos de dinero todavía mezclados en el catálogo

El carrito y la ficha devuelven texto (`"129.99"`), pero el listado de categoría, la búsqueda y las colecciones devuelven `precioDesde` como número. El propio plan del 06 exige texto decimal fijo en toda la API, y las líneas de la orden nacerán de estos datos.

*Corrección:* pasar `precioDesde` (y cualquier monto de esos endpoints) por `fromCents`/texto, y ajustar `api-types.ts` y los componentes que hoy esperan número.

### NUEVO-04 [MEDIO] La IP real del cliente se toma del primer valor de `X-Forwarded-For`

El proxy de Next usa el **primer** valor del header. En varias configuraciones de balanceador, el valor que el propio cliente envía queda justo ahí (el balanceador **agrega** el suyo al final), así que un atacante podría enviar una IP distinta en cada intento y esquivar el límite de login que acabamos de arreglar.

*Corrección:* comprobarlo en staging (mandar una petición con un `X-Forwarded-For` inventado y registrar qué llega); si el valor inventado aparece primero, tomar el último de la lista. De paso: declarar `app.set("trust proxy", false)` explícito y silenciar la validación de `express-rate-limit` sobre ese header, para que no ensucie los logs.

### NUEVO-05 [BAJO] La fusión de carritos no aplica el tope de 99 ni revisa que la variante siga activa

`mergeAnonymousCart` suma cantidades contra el stock, pero no contra `MAX_CANTIDAD`, y arrastra líneas de productos que pudieron quedar inactivos mientras el carrito anónimo dormía.

### NUEVO-06 [BAJO] El orden de la búsqueda es alfabético, no por relevancia

`orderBy: [{ busqueda: "asc" }]` ordena alfabéticamente el texto normalizado; el comentario dice "coincidencia al inicio primero", que no es lo que hace. No es un error funcional (los resultados son correctos), pero el primero de la lista no es el más pertinente. Con este tamaño de catálogo alcanza con ordenar por "empieza con el término" y luego por novedad.

### NUEVO-07 [BAJO] Dos "Agregar" simultáneos de un invitado sin cookie crean dos carritos

Queda una línea huérfana en el carrito perdido. Es el caso (c) de CAR-09 pero para invitados; se resuelve con un bloqueo por token de cookie o aceptando la pérdida (muy poco frecuente).

### NUEVO-08 [BAJO] Faltan dos casos en las pruebas

No hay prueba del aviso de cambio de precio + "Entendido", ni del header `X-Access-Token-Expired` (que es justo el arreglo más delicado del carrito). Son dos pruebas cortas sobre la base que ya existe.

---

## 4. Comprobar en staging antes de arrancar el 06

1. **¿Corriste el backfill?** `npm run backfill:precio-disponible --workspace=backend` contra staging. Las columnas nuevas nacen en `NULL`/`false`: si no se corrió, el filtro de precio no devuelve nada, "solo disponibles" sale vacío y el orden por precio queda al revés. Se comprueba abriendo una categoría y filtrando por precio.
2. **¿Existe el secreto `eltesoro-internal-proxy-secret` en Secret Manager?** Los dos servicios lo piden en el despliegue; si no existe, el deploy falla. Y si queda vacío, el límite de login vuelve a ser compartido entre todos (no rompe nada, pero tampoco protege).
3. **¿El backend arrancó bien después del último despliegue?** Ahora se cae a propósito si `JWT_ACCESS_SECRET` tiene menos de 32 caracteres o si `CORS_ORIGINS` quedara en `*`. Revisa `/api/health` (debe responder `ok`, y ahora sí consulta la base) y los logs de arranque.

---

## 5. Prompt — Lote G (pre-Módulo 06)

```
Lee docs/revision/revision-14-sep-pre-modulo-06.md y corrige NUEVO-01 a NUEVO-04 (NUEVO-05 a NUEVO-08 si queda tiempo, en commits aparte). Usa las skills retail-catalog-data-model, retail-backend-api-admin y retail-cart-checkout.

Reglas: un commit por hallazgo con su ID en el mensaje; una migración de Prisma por cambio de esquema; agrega prueba automática donde aplique (ya hay vitest + Postgres en CI).

Además, antes de terminar, actualiza docs/plan/06-checkout.md con las dos decisiones de NUEVO-02 (carrito convertido y definición de "stock vendible"), para que el Módulo 06 no las improvise.

Para NUEVO-04: primero comprueba en staging qué llega realmente en X-Forwarded-For (registra el header completo en una petición de prueba) y muéstrame el resultado antes de cambiar el código.

Al terminar, dame una tabla ID → qué cambiaste → cómo lo verifico yo, y confirma que el CI quedó en verde.
```

Después de eso, usa el prompt del Módulo 06 de `docs/plan/GUIA-instrucciones-para-claude-code.md`. Antes de pegarlo necesitas tener resueltas las decisiones de negocio que ese módulo pregunta: transportistas y tarifas de envío, si hay envío gratis desde cierto monto, si existe "recoger en tienda", política de devoluciones y garantías, y el tiempo de expiración de la reserva de stock (el plan propone 60 minutos). El catálogo real no hace falta para construir el 06.
