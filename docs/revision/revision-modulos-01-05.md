# Revisión técnica — Módulos 01 a 05 (tienda El Tesoro)

- **Fecha:** 11 de septiembre de 2026
- **Alcance:** todo el código en `main` más los cambios sin commit de la carpeta local (backend, frontend, shared, workflows, Dockerfiles, importador y Excel de productos).
- **Método:** lectura completa de backend y frontend contra `docs/plan/00`–`06`, typecheck con `tsc` de backend y frontend (ambos pasan sin errores), y análisis del Excel `productos_almacen_el_tesoro_completo.xlsx`.

## Cómo usar este documento con Claude Code

1. Cada hallazgo tiene un ID (por ejemplo `SEG-01`). Al final (sección 7) hay **prompts listos por lote**; pega **un lote por conversación**, igual que la regla de oro de la GUIA.
2. Antes del primer lote, resuelve `OPS-01` (commitear lo pendiente) para que cada corrección quede en su propio commit.
3. Claude Code puede leer este archivo directo: *"Lee `docs/revision/revision-modulos-01-05.md` y corrige el Lote A"*.
4. Severidades: **CRÍTICO** (riesgo de seguridad o de datos, corregir ya) · **ALTO** (corregir antes del Módulo 06) · **MEDIO** (corregir antes del lanzamiento, Módulo 09) · **BAJO** (mejora, cuando haya tiempo).

---

## Resumen

**Lo que está bien hecho (no tocar):** arquitectura por capas routes → controllers → services; validación con zod en todos los endpoints; tokens de verificación, recuperación y refresh guardados solo como hash sha256; rotación de refresh token y cierre de todas las sesiones al cambiar contraseña; cookies httpOnly; protección contra IDOR (404 idéntico para "no existe" y "no es tuyo" en direcciones y carrito); anti-enumeración en "olvidé mi contraseña"; proxy same-origin en Next para las cookies; estados de carga/error/vacío en casi todas las vistas; typecheck limpio.

**Conteo:** 1 crítico, 13 altos, 20 medios y 17 bajos, más 5 puntos urgentes fuera del código (sección 0).

### Estado del checklist "Listo cuando…" del Módulo 05

| Criterio del plan | Estado |
|---|---|
| Agregar/cambiar/eliminar actualiza totales correctamente | Cumple (ojo con decimales, `CAR-05`) |
| El carrito anónimo sobrevive al cierre del navegador | Cumple (cookie de 30 días) |
| Fusión anónimo → cuenta sin duplicados | Cumple al iniciar sesión; falla si la sesión expira a media navegación (`CAR-01`) |
| Pedir 10 con 4 en stock limita a 4 **con mensaje visible** | Parcial: no hay selector de cantidad en la ficha y el aviso `limitado` se ignora (`CAR-03`) |
| Cambio de precio mostrado con aviso | Cumple (mejorable, `CAR-11`) |
| Contador del carrito consistente **en todas las pestañas** | **No cumple**: no hay sincronización entre pestañas (`CAR-02`) |

---

## 0. Urgente — fuera del código (esta semana)

**OPS-00 — La base de datos de staging es una instancia de prueba gratuita que vence pronto.**
El README del backend indica que Cloud SQL `proyectoalmaceneltesoro` es una *instancia de prueba gratuita Enterprise Plus*. Esas instancias duran 30 días; luego dejan de responder (los datos se guardan 90 días más y después se borran) y no permiten backups. Se creó alrededor del 28-ago, así que **dejaría de responder cerca del 27-sep** (confirma la fecha exacta en la consola de GCP). Ese día todo staging se cae. Decide antes: actualizar a una instancia pagada pequeña (edición *Enterprise*, no *Enterprise Plus*, que es la más cara) o crear una nueva y migrar. **Plan de acción completo en `docs/revision/migracion-gcp-staging.md`** (migración a un proyecto dedicado `diginet-eltesoro-stg`). Hazla ANTES de los lotes.

**OPS-01 — Hay trabajo sin commitear que rompe staging.**
La página `/staff/inventario` ya está en `main`, pero su backend no: `staffInventory.controller/service/routes/validator.ts`, `scripts/create-staff-user.ts` y la línea en `routes/index.ts` están sin commit. En staging, la página llama a un endpoint que no existe. Además `seed.ts` y dos CSS aparecen modificados **solo por fines de línea (CRLF)** (ver `INF-07`), y el Excel cambió.

**DAT-01 — Los datos del Excel actual parecen de relleno.**
Ahora las 1,270 filas tienen precio, pero **1,201 tienen exactamente Q100** y **las 1,270 tienen existencia 120**. Parece que alguien reemplazó "Consultar precio" con valores de prueba. Sirve para probar, pero confírmalo con Luis Miguel antes de importarlo, y que nunca llegue así a producción.

**DAT-02 — Falta definir la unidad de venta.** Muchas descripciones dicen "(12 x caja)", "(6 x caja)". ¿El precio es por unidad o por caja? Afecta al carrito, al checkout y a todo el portal B2B. Hay que preguntarlo.

**DAT-03 — Hay códigos duplicados que probablemente son variantes.** 52 códigos se repiten en 217 filas (ejemplo: el código 201 es la misma "Olla con aro convexa" en 6 tamaños). Pregunta si son variantes del mismo producto; si lo son, conviene agruparlas (ver `IMP-03`). Además, 220 filas dicen "Sin imagen disponible".

---

## 1. Seguridad y configuración del backend

**SEG-01 [CRÍTICO] Secreto JWT con valor por defecto.**
`backend/src/config/env.ts:22` → `required("JWT_ACCESS_SECRET", "dev-access-secret-cambiar-en-produccion")`. Como tiene un valor de respaldo, nunca falla. Si en algún entorno falta la variable, cualquiera que conozca ese texto (está en el repositorio) puede firmar un token con `role: "admin"`. Staging hoy sí lo toma de Secret Manager, pero producción no debe arrancar sin él.
*Corrección:* sin respaldo cuando `NODE_ENV=production`; exigir 32 caracteres o más; el servidor no arranca si falta.

**SEG-02 [ALTO] El límite de intentos de login bloquea a todos a la vez.**
No hay `app.set("trust proxy")` y todas las llamadas del navegador pasan por el proxy de Next (`frontend/src/app/api/[...path]/route.ts`). El backend ve la IP del servidor de Next o de Google, no la del cliente, así que los "10 intentos / 15 min" se comparten entre **todos** los usuarios: 10 intentos fallidos de cualquiera bloquean el login de toda la tienda.
*Cómo verificarlo:* busca `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` en los logs de Cloud Run del backend, o registra `req.ip` en staging.
*Corrección:* el proxy de Next envía la IP real del cliente en un header propio junto con un secreto compartido (variable de entorno); el backend usa un `keyGenerator` que confía en ese header solo si el secreto coincide. Agregar también un límite por correo en `/auth/login`.

**SEG-03 [ALTO] Los logs guardan cookies y tokens de sesión.**
`app.ts:26` `pinoHttp({ logger })` registra por defecto los headers de cada request, incluidas las cookies `eltesoro_at`, `eltesoro_rt` y `eltesoro_cart`. Cualquiera con acceso a Cloud Logging puede secuestrar sesiones.
*Corrección:* `redact` de `req.headers.cookie`, `req.headers.authorization` y `res.headers["set-cookie"]`.

**SEG-04 [ALTO] Los vendedores tendrían que ser administradores.**
`/staff/inventory` exige `requireRole("admin")` y `create-staff-user.ts` crea admins. Para darle la app de consulta de precio y stock al personal de tienda, tendrías que hacerlos admin, y en el Módulo 08 ese rol tendrá el panel completo (editar precios, pedidos).
*Corrección:* agregar ahora el rol `staff` al enum (una migración pequeña); la ruta acepta `admin` o `staff`; el script crea `staff` por defecto y admin solo con `--role=admin`.

**SEG-05 [MEDIO] CORS abierto a cualquier origen con credenciales.**
`deploy-staging.yml:97` usa `CORS_ORIGINS=*` y `app.ts:20` refleja cualquier origin con `credentials: true`. Hoy lo mitiga `SameSite=Lax`, pero es la configuración que hay que eliminar. Nota: el autocompletado del buscador llama directo al backend (`NEXT_PUBLIC_API_URL`), así que hay que permitir esa origin o pasar la llamada por `/api`.
*Corrección:* `CORS_ORIGINS` = URL exacta del frontend, también en staging.

**SEG-06 [MEDIO] Errores que deberían ser 400/409 responden 500.**
`errorHandler.middleware.ts` no reconoce: JSON malformado (`entity.parse.failed` de `express.json`), `P2002` de Prisma (duplicado por doble registro simultáneo o carrito duplicado) ni `P2025` (registro no encontrado).
*Corrección:* mapearlos a 400, 409 y 404 con el formato estándar.

**SEG-07 [MEDIO] Redirección abierta después del login.**
`frontend/src/app/cuenta/login/page.tsx:27` → `router.push(searchParams.get("next") || ...)` acepta URLs externas (`?next=https://sitio-falso.com`), útil para phishing.
*Corrección:* aceptar solo rutas que empiecen con `/` y no con `//`.

**SEG-08 [MEDIO] El registro deja cuentas "huérfanas" si falla el correo.**
`auth.service.ts` crea el usuario y después `sendVerificationEmail` lanza `EMAIL_SEND_FAILED` (400). Al reintentar, el cliente recibe "Ya existe una cuenta con este correo" y queda atascado.
*Corrección:* si el correo falla después de crear el usuario, responder 201 con `emailSent: false` y que la interfaz ofrezca "Reenviar verificación".

**SEG-09 [BAJO] Sin cabeceras de seguridad.** Falta `helmet` en la API y `headers()` en `next.config.ts` (CSP básica, `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`). Es para el Módulo 09, pero sale barato hacerlo ahora.

**SEG-10 [BAJO] JSON-LD sin escapar.** `producto/[slug]/page.tsx:101-102` y `layout.tsx` insertan `JSON.stringify(...)` con `dangerouslySetInnerHTML`. Cuando el panel admin (08) permita editar nombres, un nombre con `</script>` rompería la página o permitiría inyectar código. *Corrección:* reemplazar `<` por `\u003c`.

**SEG-11 [BAJO] Ajustes menores de autenticación.** Los enlaces de recuperación anteriores siguen válidos después de un cambio de contraseña exitoso; no hay limpieza de refresh tokens ni carritos anónimos vencidos; la contraseña no tiene longitud máxima (bcrypt solo usa 72 bytes); si Brevo falla se responde 400 en vez de 502/503; el login con un correo inexistente responde más rápido (permite adivinar qué correos existen).

---

## 2. Carrito (Módulo 05)

**CAR-01 [ALTO] El carrito "desaparece" cuando la sesión expira a media navegación.**
El access token dura 15 min y su cookie también (`utils/cookies.ts:24`, `maxAge` de 15 min). `frontend/src/services/cartApi.ts` no reintenta con refresh (a diferencia de `accountApi.ts`), y `/cart` usa `optionalAuth`. Después de 15 min sin recargar, la siguiente acción del carrito se trata como invitado: el header muestra el carrito vacío y "Agregar" crea un carrito anónimo nuevo. Al recargar se arregla solo (se fusiona), pero el cliente ve desaparecer sus productos.
*Cómo reproducirlo:* iniciar sesión → agregar 2 productos → esperar 16 min sin recargar → agregar otro → el drawer muestra solo 1.
*Corrección:* un único cliente HTTP (unificar `cartApi` y `accountApi`) con refresh y reintento ante 401; la cookie del access token debe durar más que el JWT (por ejemplo, igual que el refresh) para que el backend detecte un token *expirado* y `optionalAuth` responda `401 TOKEN_EXPIRED` en vez de degradar a invitado. Opcional: refresh preventivo cada ~12 min mientras la pestaña esté activa.

**CAR-02 [ALTO] No hay sincronización entre pestañas (criterio del checklist).**
`CartContext.tsx` solo carga el carrito al montarse. Si agregas en una pestaña, la otra sigue mostrando el contador viejo. Lo mismo pasa con la sesión (cerrar sesión en una pestaña no afecta a las demás).
*Corrección:* `BroadcastChannel("eltesoro-cart")` avisado después de cada mutación, más volver a cargar en `visibilitychange`/`focus`. Lo mismo para login/logout en `UserContext`.

**CAR-03 [ALTO] El límite de stock no muestra mensaje.**
`ProductViewer.tsx` siempre agrega 1 e **ignora** el `limitado` que devuelve el backend; no hay selector de cantidad en la ficha, y en el carrito el botón "+" se deshabilita sin explicar por qué. Además, `updateItemQuantity` no devuelve `limitado`.
*Corrección:* selector de cantidad en la ficha (de 1 a min(stock, 99)); cuando `limitado=true`, mostrar "Solo hay X disponibles; agregamos X" (en la ficha y en la tarjeta); texto visible al llegar al máximo en el stepper; que `PATCH /cart/items/:id` también devuelva `limitado`.

**CAR-04 [ALTO] Elegir una combinación inexistente agrega el producto equivocado.**
`ProductViewer.tsx:45` → `findMatchingVariant(...) ?? firstVariant`. Si el cliente elige una combinación que no existe (Color X + Tamaño Y), la ficha muestra el precio y stock de la primera variante, y "Agregar al carrito" mete **esa** al carrito.
*Corrección:* si no hay coincidencia, deshabilitar el botón con el texto "Combinación no disponible"; marcar como no disponibles las opciones que no combinan con lo ya elegido; al cambiar un atributo, ajustar los demás a una combinación válida.

**CAR-05 [ALTO — bloquea el Módulo 06] El dinero se calcula con decimales de JavaScript.**
`cart.service.ts:67-97` usa `Number(precio) * cantidad` y suma con `reduce`. Verificado: `10.1 + 20.2 = 30.299999999999997`. Hoy lo disimula `formatCurrency`, pero el 06 va a guardar totales en órdenes y el 07 va a cobrar y facturar (FEL exige totales exactos). Además, la API mezcla tipos: la ficha devuelve `precio` como texto (`"129.99"`) y el listado como número.
*Corrección:* un utilitario de dinero en `shared/` (Prisma `Decimal` o centavos enteros) que usen el carrito y las futuras órdenes; que la API devuelva los montos siempre con el mismo tipo y formato.

**CAR-06 [MEDIO] El mensaje de stock no coincide con lo que pasa.**
`CartItemRow.tsx:110-111` dice "Solo quedan X disponibles — se ajustó la cantidad", pero el servidor **no** ajustó nada (`stockLimitado` solo significa cantidad > stock al leer), y el subtotal sigue contando unidades que no existen.
*Corrección:* al leer el carrito, recortar la cantidad al stock y guardarla; o bien cambiar el mensaje a "Reduce a X" y excluir esas unidades del total.

**CAR-07 [MEDIO] Los errores al cambiar cantidad o eliminar no se muestran.**
En `CartItemRow.tsx`, `changeQuantity` y `remove` no tienen `catch`: si la API falla, la promesa se rechaza sin que el cliente vea nada. `AddToCartButton` muestra "No se pudo agregar" sin la razón (por ejemplo, agotado).
*Corrección:* mostrar el mensaje del backend en la línea o en un Toast.

**CAR-08 [MEDIO] Después de cerrar sesión, el carrito del usuario sigue visible.**
`CartContext` no se limpia al pasar a `unauthenticated`: el header y el drawer siguen mostrando los productos de la cuenta hasta recargar. En una computadora compartida es un problema de privacidad.
*Corrección:* volver a cargar el carrito (quedará vacío o anónimo) al cerrar sesión.

**CAR-09 [MEDIO] Condiciones de carrera.**
(a) Dos clics rápidos en "Agregar" leen y escriben la misma cantidad y se pierde una unidad → usar `increment` atómico. (b) El primer "Agregar" de un invitado desde dos pestañas o con dos clics antes de recibir la cookie crea dos carritos. (c) La creación simultánea del carrito de un usuario da `P2002` → 500 (ver `SEG-06`). (d) En `CartContext`, la carga inicial (`fetchCart`) puede terminar después del `mergeCart` y sobrescribir el carrito fusionado.

**CAR-10 [MEDIO] El texto sobre impuestos contradice el plan.**
`CartDrawer.tsx:69` y `CartPageView.tsx:52` dicen "Envío e impuestos se calculan en el checkout", pero el plan (Módulo 06) fija **precios con IVA incluido**. El cliente va a pensar que se le sumará IVA.
*Corrección:* "Precios con IVA incluido. El envío se calcula en el checkout." Además, en la página del carrito renombrar "Total" a "Subtotal" (el total real incluye el envío).

**CAR-11 [BAJO] El aviso de cambio de precio es incompleto.** No dice el precio anterior ni el nuevo; solo desaparece si se toca la línea; `addItem` actualiza el precio congelado sin que el cliente haya visto el aviso, y `merge` no lo actualiza.
*Corrección:* "Antes Q X, ahora Q Y" con un botón "Entendido" que actualice el precio congelado.

**CAR-12 [BAJO] El tope de 99 por línea se puede superar** con varios "Agregar" seguidos (`addItem` suma la cantidad existente más la nueva sin aplicar el 99).

**CAR-13 [NOTA para el Módulo 06 — no corregir ahora, pero tenerlo en cuenta]**
- `Cart.userId` es `@unique` y `findCartId` no filtra por `estado`. Cuando el 06 marque un carrito como `convertido`, el usuario seguiría viendo ese carrito o no podría tener otro. Hay que decidir en el 06: vaciar y reutilizar, o quitar el `unique` y filtrar por `activo`.
- El "stock vendible" debe calcularse como `cantidadDisponible − cantidadReservada` en **un solo helper** que usen el carrito, la ficha, los listados y el checkout.

---

## 3. Catálogo público (Módulos 02–03)

**CAT-01 [ALTO] Los productos en borrador o descontinuados se ven por URL.**
`products.service.ts:155-170` (`getProductBySlug`) no filtra por `estado` ni por variantes activas, y los relacionados curados tampoco. Cualquier slug en borrador responde 200, Google lo puede indexar, y la ficha muestra variantes inactivas que luego fallan al agregarlas al carrito.
*Corrección:* `estado: "activo"` (404 si no lo está), `variants where activo: true`, relacionados solo activos.

**CAT-02 [MEDIO] Rendimiento con el catálogo completo (1,270 productos).**
`listProductsByCategory` carga en memoria **todos** los productos de la categoría (con variantes, imágenes y atributos) en cada request para ordenar por precio. La página de categoría lo llama dos veces (resultados + facetas con `limit: 100`) y el home una vez por departamento. Hoy funciona porque se importaron pocos productos; con el Excel completo se va a notar.
*Corrección:* columnas desnormalizadas `precioDesde` y `disponible` en `products` (las mantiene el importador y, más adelante, el panel admin); orden y paginación en SQL; un endpoint de facetas (marcas, materiales, rango de precio) calculado con `groupBy`.

**CAT-03 [MEDIO] Las facetas están incompletas.** Las marcas y materiales del filtro salen de los primeros 100 productos (`categoria/[slug]/page.tsx:73`); si la categoría tiene más, faltan marcas. Se resuelve con el endpoint de facetas de `CAT-02`.

**CAT-04 [MEDIO] Limitaciones de la búsqueda.**
"olla presto" encuentra resultados, pero "presto olla" no (se busca la frase completa con `contains`); el índice btree sobre `busqueda` no sirve para `contains`; no hay orden por relevancia; y los resultados no traen `disponible` ni `marca`, así que la tarjeta **nunca** muestra "Agotado" en la búsqueda.
*Corrección:* partir el término en palabras (un AND de `contains`), índice GIN con `pg_trgm` (migración), y devolver el mismo formato que el listado (`toSummary`).

**CAT-05 [MEDIO] El sitemap está incompleto.** `app/sitemap.ts` solo recorre categorías hoja y un máximo de 100 productos por categoría; los productos asignados a categorías padre quedan fuera y no hay `lastModified`.
*Corrección:* un endpoint `/api/sitemap` en el backend que devuelva todos los slugs activos con su `updatedAt`.

**CAT-06 [MEDIO] Los banners del home no se pueden administrar.**
El home arma los banners automáticamente con fotos de productos (`app/page.tsx`). El plan pedía "bloques promocionales gestionables por datos", y tú vas a cobrar la actualización de banners en el mantenimiento mensual.
*Corrección mínima:* tabla `Banner` (título, subtítulo, imagen, enlace, orden, activo, fecha de inicio y fin), o un JSON en Cloud Storage, editable por ti sin volver a desplegar; si no hay banners activos, se usa el comportamiento actual.

**CAT-07 [BAJO] JSON-LD con un solo precio.** Usar `AggregateOffer` (`lowPrice`/`highPrice`) cuando hay varias variantes; hoy toma el precio de la primera.

**CAT-08 [BAJO] Tarjeta de producto.** Dice "Desde Q…" aunque haya un solo precio. Además, toda la tarjeta es un `<Link>` que contiene botones (favorito, agregar), lo cual es HTML inválido y confunde a los lectores de pantalla; el mismo patrón `<Link><Button>` se repite en el carrito, el drawer y el checkout.
*Corrección:* enlace solo en la imagen y el nombre, botones fuera del `<a>`; un `Button` con prop `href` (o un componente `LinkButton`).

**CAT-09 [BAJO] El menú muestra categorías sin productos activos** (en el mega-menú y en el sitemap aparecen páginas vacías). Filtrarlas en `getCategoryTree`, o incluir un conteo.

**CAT-10 [BAJO]** `collections.service.ts`: la paginación no tiene `orderBy` (el orden cambia entre páginas).

---

## 4. Importador y datos

**IMP-01 [ALTO] La identidad de cada producto es el número de fila del Excel.**
`scripts/import-catalog.ts` → `const externalId = String(fila)`. Si el Excel se reordena, o se inserta o borra una fila, al re-importar el producto de la fila 50 recibe los datos de **otro** producto pero conserva su slug, su SKU, sus fotos y los carritos que lo tenían: las URLs quedan mostrando otro artículo.
*Corrección:* una clave estable basada en el Código (requiere resolver antes `DAT-03`), y detectar y reportar códigos duplicados en vez de aceptarlos en silencio.

**IMP-02 [MEDIO] Los productos que salen del Excel nunca se desactivan.** Al final de la corrida, lo que tenga `externalSource = excel_almacen_2026` y no haya venido en el archivo debe quedar `descontinuado` (con un flag `--dry-run` que muestre qué se va a desactivar antes de hacerlo).

**IMP-03 [MEDIO, depende de DAT-03] Agrupar variantes.** Si se confirma que las filas con el mismo código son tamaños o colores del mismo producto, el importador debería crear **un** producto con variantes (Tamaño/Color) en vez de 6 tarjetas casi iguales. Mejora mucho la navegación y el selector de la ficha.

**IMP-04 [BAJO]** El README del backend está desactualizado ("71 de 1270 filas"), y el Excel nuevo todavía no se ha re-importado (confirmar `DAT-01` antes de hacerlo).

---

## 5. Infraestructura, CI y repositorio

**INF-01 [ALTO] El desarrollo local trabaja sobre la base de STAGING.**
`backend/.env` apunta al Cloud SQL Auth Proxy de staging. Un `prisma migrate dev` desde tu máquina puede pedir un "reset" y **borrar staging**, y las pruebas manuales ensucian los datos que ve el cliente.
*Corrección:* el `.env` local debe apuntar a `infra/docker-compose.yml` (Postgres local, ya existe); crear un `.env.staging` aparte solo para el importador, con un aviso claro.

**INF-02 [ALTO] Los servicios corren con la cuenta de despliegue.**
`deploy-staging.yml:99` y `deploy-staging-frontend.yml:84` usan `--service-account=DEPLOYER_SA` también como identidad **de ejecución**. Si alguien compromete la app, obtiene permisos para desplegar y leer todos los secretos.
*Corrección:* una cuenta de servicio de runtime separada, con solo Cloud SQL Client, Secret Accessor (limitado a esos secretos) y lectura de Storage. El deployer necesita `iam.serviceAccountUser` sobre ella.

**INF-03 [MEDIO] El despliegue no espera al CI.** Un push a `main` dispara el deploy en paralelo con lint/build, así que código roto puede llegar a staging (y el backend corre las migraciones antes de construir la imagen).
*Corrección:* desplegar con `workflow_run` después de que el CI termine bien, o con `needs:` dentro del mismo workflow.

**INF-04 [MEDIO] No hay ninguna prueba automática.** Antes del checkout y los pagos, agregar pruebas de integración mínimas (vitest + supertest contra un Postgres de servicio en GitHub Actions): auth (registro, login, refresh, reset), carrito (agregar, límite de stock, fusión, IDOR) y direcciones (IDOR). Que corran en el CI.

**INF-05 [MEDIO] El remitente de los correos es tu Gmail personal.** `deploy-staging.yml:27` → `EMAIL_FROM: afranco.sears@gmail.com`. Enviar "desde" gmail.com a través de Brevo falla la alineación DMARC (los correos llegan a spam) y expone tu correo a los clientes. Antes del 09: dominio propio verificado en Brevo (SPF/DKIM/DMARC).

**INF-06 [BAJO] Costo fijo en staging.** `min-instances=1` en el frontend y el backend de staging cobra aunque nadie lo use. Poner 0 en staging (el plan lo sugería) y 1 solo en producción.

**INF-07 [BAJO] Falta `.gitattributes`.** Sin `* text=auto eol=lf` aparecen cambios fantasma por CRLF (hoy en `seed.ts` y dos CSS). Agregarlo y normalizar una sola vez.

**INF-08 [BAJO] Valores fijos en `next.config.ts`.** `remotePatterns` apunta solo al bucket de **staging** (en producción las imágenes no cargarían) y `allowedDevOrigins` tiene una IP fija. Leer ambos de variables de entorno. Además, el comentario sobre `API_ORIGIN`/rewrite en `deploy-staging-frontend.yml` quedó obsoleto (ya no se usa rewrite).

**INF-09 [BAJO] Páginas internas públicas.** `/dev/design` y `/staff/inventario` son accesibles e indexables. Bloquear `/dev/design` en producción (`notFound()` salvo que se active con un flag); agregar `/staff`, `/favoritos` y `/api` a `robots.ts`, y `noindex` en un layout de `/staff`.

**INF-10 [BAJO] Varios.** El contenedor corre como root (agregar `USER node`); `/api/health` no verifica la base de datos; hay carpetas duplicadas (`plan-modular/` vs `docs/plan/`, y `retail-*/` en la raíz vs `.claude/skills/`) que pueden desalinearse: dejar una sola fuente.

---

## 6. UX y contenido

**UX-01 [ALTO] Se rechaza el teléfono escrito con guion.** El placeholder (`AddressForm.tsx:77`, `perfil/page.tsx:74`) y el propio mensaje de error dicen "5512-3456", pero el backend (`address.validator.ts:11`, `profile.validator.ts`) solo acepta 8 dígitos seguidos. Quien escribe el teléfono tal como se le indica recibe un error. Esto se va a repetir en el checkout.
*Corrección:* normalizar en backend y frontend (quitar espacios y guiones, aceptar +502) y guardar el número normalizado.

**UX-02 [MEDIO] Enlaces vacíos y sin política de privacidad.** El footer tiene enlaces a `#` (Envíos, Devoluciones, Contacto, Sobre El Tesoro, Portal mayorista) y no hay política de privacidad, aunque el sitio ya recoge correos (newsletter y cuentas). Crear páginas estáticas (aunque sea con texto provisional) y enlazar la privacidad desde el registro y el popup.

**UX-03 [BAJO] El drawer del carrito no maneja el foco.** No mueve el foco al abrirse, no lo devuelve al cerrarse, y con Tab se puede navegar detrás del overlay.

**UX-04 [BAJO]** "Envíos a todo Guatemala" (`TrustBadges.tsx`) promete algo que aún no está decidido (la política de envíos es una decisión pendiente del 06). Ajustar el texto cuando se defina.

---

## 7. Prompts para Claude Code (un lote por conversación)

**Orden recomendado:** OPS-01 → **migración de staging (`migracion-gcp-staging.md`, antes del 24-sep)** → Lote A → Lote B1 → Lote B2 → Lote C → Lote E → Lote F → Lote D (cuando Luis Miguel responda DAT-01/02/03) → Módulo 06.

> Si ya hiciste la migración, INF-01, INF-02, INF-03, INF-06, INF-08 y SEG-05 quedaron resueltos ahí: sáltalos en los lotes A y E.

### Preparación (antes del Lote A)
```
Antes de corregir nada: el backend de /staff/inventory (controller, service, routes, validator, scripts/create-staff-user.ts y la línea en routes/index.ts) está sin commit, pero la página del frontend ya está en main. Agrega un .gitattributes con "* text=auto eol=lf", normaliza los fines de línea en un commit aparte ("Normaliza fines de línea"), y luego commitea el trabajo de staff en su propio commit. No incluyas el Excel. Muéstrame git status al terminar.
```

### Lote A — Seguridad del backend
```
Lee docs/revision/revision-modulos-01-05.md, sección 1, y corrige SEG-01 a SEG-08 (SEG-09 opcional si queda simple). Usa las skills retail-backend-api-admin y retail-gcp-deployment-devops.
Reglas: no cambies el alcance funcional de ningún módulo; una migración de Prisma por cambio de esquema (SEG-04 agrega el rol staff); un commit por hallazgo con su ID en el mensaje.
Pregúntame antes de empezar: el nombre del rol para vendedores (propuesta: "staff").
Para SEG-02, verifica primero en staging qué IP ve hoy el backend (loguea req.ip temporalmente) y muéstrame el resultado antes y después.
Al terminar, dame una tabla: ID → qué cambiaste → cómo lo verifico yo en staging.
```

### Lote B1 — Carrito: sesión y sincronización
```
Lee docs/revision/revision-modulos-01-05.md, sección 2, y corrige CAR-01, CAR-02, CAR-08 y CAR-09. Usa las skills retail-cart-checkout y retail-frontend-react-components.
Para CAR-01 unifica cartApi.ts y accountApi.ts en un solo cliente HTTP con refresh+reintento, y haz que el backend distinga "token expirado" de "sin token" en optionalAuth.
Reglas: el carrito sigue siendo anónimo por diseño; no implementes reserva de stock (es del Módulo 06).
Al terminar, demuéstrame en staging: (1) sesión con access token vencido → el carrito sigue mostrando mis productos; (2) dos pestañas abiertas → el contador se actualiza en ambas; (3) cerrar sesión → el carrito del usuario ya no se ve.
```

### Lote B2 — Carrito: cantidades, variantes y dinero
```
Lee docs/revision/revision-modulos-01-05.md, sección 2, y corrige CAR-03, CAR-04, CAR-05, CAR-06, CAR-07, CAR-10, CAR-11 y CAR-12. No toques CAR-13 (es nota para el Módulo 06).
Para CAR-05 crea un utilitario de dinero en shared/ que usen el backend y el frontend, y deja documentado en docs/plan/06-checkout.md que las órdenes deben usarlo.
Al terminar, demuéstrame el checklist completo del Módulo 05 en staging, incluyendo "pedir 10 con 4 en stock limita a 4 con mensaje visible" y una combinación de variantes inexistente.
```

### Lote C — Catálogo público
```
Lee docs/revision/revision-modulos-01-05.md, sección 3, y corrige CAT-01 a CAT-10. Usa las skills retail-catalog-data-model, retail-backend-api-admin y retail-seo-performance.
Para CAT-02 propón primero el cambio de esquema (columnas desnormalizadas + endpoint de facetas) y espera mi OK antes de migrar.
Para CAT-06 propón la opción más simple para que yo (no el cliente) actualice banners sin redeploy.
Al terminar: tiempos de respuesta de /categories/:slug/products antes/después con el catálogo completo, y Lighthouse de home, categoría y producto.
```

### Lote D — Importador (solo cuando tengas respuesta de DAT-01/02/03)
```
Lee docs/revision/revision-modulos-01-05.md, secciones 0 y 4, y corrige IMP-01 a IMP-04. Respuestas del negocio: [pega aquí lo que diga Luis Miguel sobre precios, unidad de venta y códigos duplicados].
Corre primero el importador con --dry-run contra la base LOCAL (no staging) y muéstrame el reporte antes de tocar staging.
```

### Lote E — Infraestructura y CI
```
Lee docs/revision/revision-modulos-01-05.md, sección 5, y corrige INF-01 a INF-10 (INF-07 ya se hizo en la preparación). Usa la skill retail-gcp-deployment-devops.
Para INF-02 dame los comandos gcloud para crear la cuenta de servicio de runtime y los permisos, y espera a que yo confirme que los ejecuté antes de cambiar los workflows.
Para INF-04 agrega las pruebas mínimas de auth, carrito y direcciones y que corran en el CI.
Recuérdame también revisar la fecha de vencimiento de la instancia de prueba de Cloud SQL (OPS-00) y dame las opciones de actualización con su costo mensual estimado.
```

### Lote F — UX y contenido
```
Lee docs/revision/revision-modulos-01-05.md, sección 6, y corrige UX-01 a UX-04. Para UX-02 crea páginas estáticas con texto provisional marcado como "BORRADOR — pendiente de aprobación del negocio" y enlaza la política de privacidad desde el registro y el popup del newsletter. Usa las skills retail-ux-design-system y retail-frontend-react-components.
```
