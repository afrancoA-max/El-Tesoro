# Módulo 12 — SEO y rendimiento (transversal, con consolidación final)

## 1. Nombre y objetivo

**SEO y rendimiento.** Que la tienda sea encontrable en Google y rápida en los teléfonos reales de Guatemala — trabajado de forma continua desde el módulo 03 y consolidado aquí con medición y mejora sobre tráfico real.

## 2. Alcance funcional

Este módulo tiene dos partes: **tres compuertas transversales** que ya viven dentro de otros módulos (se listan aquí como fuente única de verdad, no se re-implementan), y un **cierre de consolidación** que es el trabajo propio del módulo 12.

**Compuertas transversales (definidas aquí, ejecutadas allá):**

- **Compuerta #1 — al cerrar el módulo 03:** metadatos por tipo de página, URLs limpias y estables, datos estructurados `Product`, imágenes optimizadas (formatos modernos, lazy loading), y umbrales Lighthouse móvil: Performance ≥ 85, SEO ≥ 95, Accesibilidad ≥ 90. Desde aquí, **ninguna página nueva de los módulos 04–11 puede caer por debajo de estos umbrales** (el checklist de cada módulo lo hereda implícitamente).
- **Compuerta #2 — dentro del módulo 09 (pre-lanzamiento):** sitemap.xml dinámico, robots.txt (bloqueando admin, checkout, cuentas y staging completo), canónicas, Open Graph para compartir en redes/WhatsApp (crítico en GT), verificación en Search Console, y re-auditoría Lighthouse sobre el dominio real con CDN activo.
- **Compuerta #3 — este módulo, post-lanzamiento.**

**Cierre de consolidación (el trabajo del módulo 12):**

- Analítica implementada (GA4 o alternativa — ver punto 6) con eventos de e-commerce: vista de producto, agregar al carrito, inicio de checkout, compra, solicitud de cotización.
- Google Merchant Center con feed de productos generado automáticamente desde el catálogo (habilita Google Shopping — alto retorno en retail).
- Medición de Core Web Vitals con datos de usuarios reales (CrUX/RUM), no solo Lighthouse, y corrección de las páginas que fallen en campo.
- Presupuesto de rendimiento formalizado en CI (falla el build si el peso de JS o los umbrales se degradan).
- Rutina de auditoría continua documentada (según la skill de SEO, sección 9): qué se revisa mensualmente y dónde se miran los datos.

**Queda fuera:** creación de contenido/blog, campañas de pago, y link building — son marketing, no producto.

## 3. Dependencias

- Las compuertas #1 y #2 viven dentro de los módulos 03 y 09. El cierre de consolidación requiere **09 en producción** (necesita dominio real y tráfico real). Puede correr en paralelo con 10 y 11.

## 4. Skills involucradas

- `retail-seo-performance` — todas las secciones; es la skill rectora del módulo.
- `retail-frontend-react-components` — rendimiento en cliente (7) para las correcciones que surjan de datos de campo.
- `retail-gcp-deployment-devops` — caché/CDN (4) y monitoreo (9) para los ajustes de entrega.

## 5. Listo cuando…

- [ ] Search Console muestra las páginas principales indexadas sin errores de cobertura ni de datos estructurados, dos semanas después del lanzamiento.
- [ ] Buscar en Google `site:<dominio>` muestra home, categorías y productos con título y descripción correctos (no "Sin título" ni URLs con parámetros).
- [ ] Compartir una ficha de producto por WhatsApp muestra imagen, nombre y precio en la tarjeta previa.
- [ ] El feed de Merchant Center valida sin errores y los productos aparecen aprobados.
- [ ] GA4 registra el funnel completo verificable con una compra de prueba: producto → carrito → checkout → compra.
- [ ] El informe de Core Web Vitals de Search Console (o RUM propio) muestra las plantillas clave "en verde" con datos de campo, o existe un plan de corrección con responsable por cada una que falle.
- [ ] Un PR de prueba que agregue 200 KB de JS al bundle principal hace fallar el CI (presupuesto de rendimiento activo).

## 6. Riesgos y decisiones pendientes

- **Herramienta de analítica:** GA4 (gratuita, estándar) vs. alternativas de privacidad (Plausible, etc.). Recomendación GA4 + Search Console; confirmar con el dueño. Requiere banner/aviso de cookies acorde a la política de privacidad publicada en 09.
- **Merchant Center:** requiere que la política de devoluciones y datos de contacto estén publicados (dependencia del 09) — si el dueño no quiere Google Shopping en fase 1, este entregable se pospone sin bloquear el resto.
- **Riesgo típico post-lanzamiento:** degradación gradual de rendimiento al agregar módulos 10–11; el presupuesto en CI existe exactamente para eso — no aceptar excepciones "temporales".
