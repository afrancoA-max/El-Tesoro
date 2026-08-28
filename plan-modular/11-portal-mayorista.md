# Módulo 11 — Portal mayorista B2B

## 1. Nombre y objetivo

**Mayoristas.** Vender por volumen a clientes de negocio mediante cuentas aprobadas manualmente que ven precios mayoristas y compran vía cotización — sin exponer los precios B2B al público ni retrasar el negocio B2C.

**Modelo elegido (decisión ya tomada):** cuenta B2B con aprobación manual. El flujo: el interesado llena la solicitud → un admin la revisa y aprueba → el mayorista inicia sesión y navega el MISMO catálogo pero con precios mayoristas y mínimos de compra → su pedido entra como **cotización** (módulo 10) que el negocio ajusta, envía y cobra por transferencia o link de pago. Ventajas frente a las alternativas: los precios B2B no quedan públicos ante la competencia, cada cliente nuevo pasa por validación comercial (crédito, seriedad, volumen), y el cobro negociado calza con cómo se maneja mayoreo en Guatemala — todo reutilizando el 90% de lo ya construido.

## 2. Alcance funcional

**Incluye:**

- **Página pública "Mayoristas":** propuesta de valor B2B y formulario de solicitud (empresa, NIT, contacto, tipo de negocio, volumen estimado). Sin precios visibles.
- **Aprobación en el admin (extiende 08):** cola de solicitudes, aprobar/rechazar con nota; al aprobar se activa la cuenta con rol `wholesale` (rol previsto desde el módulo 04) y se envía correo de bienvenida.
- **Precios mayoristas:** el catálogo usa los campos B2B latentes del modelo (previstos en el módulo 01): precio mayorista y cantidad mínima por producto/variante, gestionables desde el admin. Un mayorista con sesión ve el precio B2B, el precio público tachado como referencia, y los mínimos; un visitante normal no ve rastro de precios B2B.
- **Carrito B2B:** mismo carrito, pero valida mínimos de compra por línea y/o monto mínimo de pedido total (definir en punto 6); su único camino de salida es "Solicitar cotización" — el checkout con pago en línea directo queda oculto para el rol `wholesale` en fase 1.
- **Historial B2B:** el mayorista ve sus cotizaciones y pedidos con estados en su cuenta.

**Queda fuera:** múltiples listas de precios por cliente (fase 2 si el negocio lo pide — ver punto 6), crédito/cuenta corriente, pago en línea directo B2B, y catálogo exclusivo B2B (los mayoristas ven el catálogo general).

## 3. Dependencias

- **04 Cuentas de usuario** — roles e infraestructura de sesión.
- **08 Panel de administración** — pantallas de aprobación y precios B2B.
- **10 Cotizaciones** — es el mecanismo de pedido y cobro mayorista.

## 4. Skills involucradas

- `retail-catalog-data-model` — activación de los campos de precio mayorista/mínimos en producto y variante (modelo previsto desde el módulo 01).
- `retail-backend-api-admin` — rol `wholesale` (3), endpoints con precios condicionados por rol, pantallas admin de aprobación y precios (5–6).
- `retail-frontend-react-components` — renderizado condicionado por rol sin duplicar componentes de catálogo.
- `retail-ux-design-system` — página pública de mayoristas y badges/etiquetas B2B con los componentes existentes.

## 5. Listo cuando…

- [ ] En staging: un interesado llena la solicitud, el admin la aprueba, y el nuevo mayorista al iniciar sesión ve precios B2B en categoría, ficha y carrito — verificado en los tres lugares.
- [ ] La API nunca devuelve precios mayoristas a sesiones sin rol `wholesale` (verificable llamando los endpoints directamente con y sin el rol, no solo mirando la UI).
- [ ] Un carrito B2B por debajo del mínimo no permite solicitar cotización y explica cuánto falta.
- [ ] La cotización creada por un mayorista llega al admin marcada como B2B, con los precios mayoristas ya aplicados, y sigue el ciclo completo del módulo 10 hasta convertirse en orden pagada.
- [ ] Un mayorista rechazado o desactivado vuelve a ver el sitio como cliente normal (precios públicos), sin error.
- [ ] Cambiar un precio mayorista en el admin se refleja en la siguiente visita del mayorista, sin afectar cotizaciones ya enviadas (snapshot).

## 6. Riesgos y decisiones pendientes

- **Estructura de precios B2B:** ¿un solo precio mayorista por producto (recomendado para fase 1) o escalas por volumen (12+, 50+, 100+)? Las escalas cambian el modelo de datos — decidir ANTES de construir.
- **Mínimo de compra:** ¿por producto, por monto total de pedido (ej. Q 3,000), o ambos? Definir con el dueño.
- **Criterios de aprobación:** qué valida el negocio (patente de comercio, NIT activo, referencias) — define los campos del formulario de solicitud.
- **¿Los mayoristas pagan envío?** Normalmente el flete B2B se negocia en la cotización — confirmar que basta con editarlo como línea en la cotización (módulo 10 ya lo permite).
- **Volumen vs. stock:** un pedido mayorista puede vaciar el inventario del canal B2C; decidir si se define stock de seguridad B2C o se maneja manualmente al aprobar cotizaciones.
