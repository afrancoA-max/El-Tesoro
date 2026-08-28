# Módulo 09 — Producción en GCP + dominio: lanzamiento B2C

## 1. Nombre y objetivo

**Producción.** Poner la tienda en su dominio definitivo, con infraestructura de producción endurecida, respaldos y monitoreo — y lanzar la venta B2C al público.

## 2. Alcance funcional

**Incluye:**

- Entorno de producción separado de staging: proyectos/servicios GCP propios, base de datos de producción con **respaldos automáticos diarios y prueba de restauración**, Secret Manager con credenciales productivas (pasarela y FEL en modo real).
- Dominio propio con HTTPS, redirecciones www/no-www y CDN/caché para estáticos e imágenes.
- Promoción controlada: el pipeline CI/CD despliega a staging automáticamente y a producción con aprobación manual (según la skill de GCP, secciones 5–6); rollback documentado y probado.
- Monitoreo y alertas: uptime checks, alertas de errores 5xx y de latencia, presupuesto de facturación GCP con alerta.
- **Compuerta SEO #2 — auditoría pre-lanzamiento** (detalle en `12-seo-performance.md`): sitemap, robots.txt, metadatos, Core Web Vitals y accesibilidad verificados sobre el dominio real antes de abrir al público.
- Checklist de lanzamiento de negocio: páginas legales publicadas (términos, privacidad, política de devoluciones del 06), datos de contacto reales, una compra real de bajo monto con tarjeta real y su factura FEL verificada en SAT (modo producción).

**Queda fuera:** cotizaciones (10), portal B2B (11), optimizaciones SEO continuas post-lanzamiento (12), y campañas de marketing (fuera del proyecto técnico).

## 3. Dependencias

- **01–08 completos.** Es el cierre de la fase B2C. (El esfuerzo aquí es pequeño por diseño: staging existe desde el módulo 02, así que producción es replicar, no descubrir.)

## 4. Skills involucradas

- `retail-gcp-deployment-devops` — todas las secciones, con énfasis en entornos (6), dominio y HTTPS (8), monitoreo (9) y costos (10).
- `retail-seo-performance` — sitemap/robots (4), auditoría (9), Search Console (8).
- `retail-payments-integration` — cambio de sandbox a credenciales productivas de pasarela y FEL (checklist de la skill).

## 5. Listo cuando…

- [ ] El sitio responde en `https://<dominio>` con certificado válido; `http://` y `www` redirigen correctamente.
- [ ] Una compra real de monto bajo, con tarjeta real, termina en orden `paid`, correo de confirmación y factura FEL válida consultable en SAT — y luego se gestiona hasta `delivered` desde el admin.
- [ ] Staging y producción no comparten base de datos, secretos ni bucket de imágenes (verificable por configuración).
- [ ] Se ejecutó una restauración de respaldo de la base en un entorno de prueba y funcionó.
- [ ] Tumbar temporalmente el backend en staging dispara la alerta configurada (prueba de monitoreo); el procedimiento de rollback se ejecutó una vez con éxito.
- [ ] Auditoría Lighthouse sobre el dominio real (móvil): Performance ≥ 85, SEO ≥ 95, Accesibilidad ≥ 90 en home, categoría y producto; sitemap enviado a Search Console sin errores de cobertura.
- [ ] Las páginas legales están publicadas y enlazadas desde el footer y el checkout.

## 6. Riesgos y decisiones pendientes

- **Dominio definitivo:** nombre y registrador — decisión del dueño; idealmente comprarlo desde el inicio del proyecto (afecta correos transaccionales y SEO). ¿`eltesoro.com.gt`, `.gt`, `.com`? Verificar disponibilidad.
- **Correo del dominio:** los correos transaccionales deben salir de una dirección del dominio con SPF/DKIM configurados — coordinar con el proveedor elegido en el módulo 04.
- **Presupuesto GCP de producción:** fijar tope mensual y revisar el dimensionamiento con la sección de costos de la skill.
- **Credenciales productivas de pasarela y FEL:** dependen de trámites externos iniciados en el módulo 07 — riesgo #1 de cronograma del lanzamiento; verificar su estado ANTES de agendar fecha de salida.
- **Fecha/estrategia de lanzamiento:** ¿lanzamiento silencioso (soft launch) con tráfico limitado la primera semana? Recomendado; confirmar con el dueño.
