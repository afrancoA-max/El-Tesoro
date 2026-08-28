# Módulo 05 — Carrito de compras

## 1. Nombre y objetivo

**Carrito.** Permitir acumular productos con sus variantes, ver el total y persistir la selección entre visitas — la antesala del checkout, sin tocar todavía datos de envío ni pago.

## 2. Alcance funcional

**Incluye:**

- Activación del CTA "Agregar al carrito" en ficha de producto (con variante seleccionada) y en la tarjeta de producto cuando el producto no tiene variantes.
- Mini-carrito (drawer/dropdown) con resumen y acceso rápido, y página de carrito completa: cambiar cantidades, eliminar líneas, subtotal por línea y total.
- Carrito **anónimo y persistente**: sobrevive a recargas y al cierre del navegador sin requerir cuenta; si el usuario inicia sesión, su carrito anónimo se fusiona con el de su cuenta (según el modelo de persistencia de la skill de carrito).
- Validación de stock al agregar y al cambiar cantidades: no permitir más unidades que el stock disponible de la variante, con mensaje claro; los precios mostrados siempre se revalidan contra la API (el cliente nunca dicta precios).
- Estado vacío del carrito con enlace a categorías destacadas.

**Queda fuera:** cálculo de envío e impuestos, cupones (se evalúan en 06), captura de dirección, creación de orden (todo eso es 06), y cualquier botón de pago (07). El botón final del carrito es "Proceder al checkout" y hasta que exista el módulo 06 lleva a una pantalla "próximamente" interna.

## 3. Dependencias

- **03 Catálogo navegable** — el carrito se alimenta desde ficha/tarjeta de producto. (No depende de 04: el carrito es anónimo por diseño; ver justificación en `04-cuentas-usuario.md`.)

## 4. Skills involucradas

- `retail-cart-checkout` — persistencia y modelo de datos del carrito (sección 1), cálculo de totales sin envío (2), validación de stock (7).
- `retail-frontend-react-components` — estado global del carrito (3), consumo de API (4).
- `retail-ux-design-system` — patrón visual de carrito (4.6), microinteracciones al agregar (6).

## 5. Listo cuando…

- [ ] En staging: agregar 3 productos distintos (uno con variante), cambiar cantidades y eliminar una línea actualiza totales correctamente en mini-carrito y página, verificado contra cálculo manual.
- [ ] Cerrar el navegador y volver al día siguiente conserva el carrito (usuario anónimo).
- [ ] Agregar producto como anónimo, luego iniciar sesión con una cuenta que ya tenía otro producto guardado → el carrito muestra ambos, sin duplicados.
- [ ] Intentar pedir 10 unidades cuando hay 4 en stock limita a 4 con mensaje visible; un producto sin stock no permite agregarse.
- [ ] Si un admin cambia el precio de un producto ya agregado, al volver al carrito se muestra el precio nuevo (con aviso), no el viejo.
- [ ] El contador del ícono de carrito en el header es consistente en todas las páginas y pestañas abiertas.

## 6. Riesgos y decisiones pendientes

- **Caducidad del carrito anónimo:** proponer 30 días y confirmarlo con el dueño (afecta limpieza de datos).
- **Reserva de stock:** en este módulo el stock se **valida** pero no se **reserva** (la reserva ocurre en el checkout, módulo 06, según la skill de carrito). Dejarlo explícito para que Claude Code no lo implemente dos veces.
- **"Guardar para después" / lista de deseos:** fuera de alcance de fase 1 salvo que el dueño lo pida; preguntar solo si sobra tiempo en el cronograma.
