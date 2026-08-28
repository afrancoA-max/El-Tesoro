# Módulo 01 — Fundacional: taxonomía, sistema de diseño y andamiaje técnico

## 1. Nombre y objetivo

**Fundacional.** Fijar qué se vende (taxonomía y modelo de datos del catálogo), cómo se ve (sistema de diseño) y sobre qué se construye (esqueleto del monorepo), para que ningún módulo posterior tenga que improvisar estructura, estilo ni nomenclatura.

## 2. Alcance funcional

**Incluye:**

- Taxonomía completa de categorías y subcategorías del negocio (propuesta inicial: Ollas y sartenes, Electrodomésticos pequeños, Cristalería, Utensilios, Menaje de mesa, Almacenamiento/contenedores — validar y ajustar con el dueño del negocio, incluyendo profundidad máxima de 2 niveles).
- Modelo de datos del catálogo definido y migrado a la base de datos: categorías, productos, variantes (tamaño, material, color, capacidad), imágenes, colecciones, inventario, relaciones entre productos. **El modelo de producto debe incluir desde ya el campo de precio mayorista y mínimo de compra B2B (aunque queden sin uso hasta el módulo 11), para no migrar después.**
- Decisión y aprovisionamiento de la base de datos (ver punto 6).
- Sistema de diseño base como código: design tokens (paleta, tipografía, espaciado, radios, sombras), componentes primitivos (botón, input, tarjeta, badge, modal, toast) y layout base (header con navegación por categorías, footer). Documentado en una página interna de referencia visual (`/dev/design`) donde se vean todos los componentes y sus estados.
- Andamiaje del monorepo según la estructura de la skill maestra: `frontend/` (Next.js + TypeScript), `backend/` (Node.js + TypeScript), `shared/`, `infra/`, `docs/`. Linting, formateo y un pipeline de CI mínimo (lint + build en cada push).

**Queda fuera:** cualquier página pública real (módulo 03), endpoints de API de negocio (módulo 02), todo lo transaccional, y la carga masiva de productos reales (módulo 02 vía seed).

## 3. Dependencias

Ninguna. Es el punto de partida.

## 4. Skills involucradas

- `retail-hogar-ecommerce-master` — visión, estructura de carpetas del monorepo, convenciones de nomenclatura y calidad (secciones 3 y 4).
- `retail-catalog-data-model` — taxonomía (sección 2), modelo producto/variantes/imágenes (sección 3), colecciones (4), atributos (5), inventario (6), decisión de base de datos (sección 1) y convenciones de datos (9).
- `retail-ux-design-system` — dirección de identidad visual (1), design tokens (2), tipografía (3), accesibilidad y estados (7), breakpoints (8). Los componentes complejos (4.x) se materializan en módulos posteriores; aquí solo primitivos.
- `retail-gcp-deployment-devops` — solo para aprovisionar la base de datos elegida y el manejo de secretos locales (sección 7); el despliegue completo llega en el módulo 02.

## 5. Listo cuando…

- [ ] La taxonomía está aprobada por el dueño del negocio y cargada en la base de datos (todas las categorías/subcategorías con slug, orden y descripción).
- [ ] Las migraciones del modelo de catálogo corren desde cero con un solo comando y dejan la base lista (incluyendo campos B2B latentes).
- [ ] Se puede insertar a mano un producto de prueba con 2 variantes y 3 imágenes sin tocar el esquema.
- [ ] La página `/dev/design` muestra todos los tokens y componentes primitivos con sus estados (normal, hover, focus, disabled, error) en móvil y escritorio.
- [ ] El monorepo compila (`frontend` y `backend`) y el CI pasa lint + build en un push de prueba.
- [ ] Ningún color, fuente o espaciado está "hardcodeado" fuera de los tokens (verificable buscando valores hex sueltos en el código de componentes).

## 6. Riesgos y decisiones pendientes

- **Base de datos (decisión bloqueante, primera semana):** recomendación Cloud SQL/PostgreSQL por el carácter relacional del catálogo (variantes, inventario, órdenes) y los reportes del módulo 08; Firestore es la alternativa si se prioriza costo inicial mínimo. Claude Code debe preguntarla y fijarla antes de escribir migraciones.
- **Identidad visual:** ¿existe logo, paleta o manual de marca de "El Tesoro", o el sistema de diseño propone la identidad desde cero? Preguntar antes de fijar tokens de color.
- **Taxonomía real:** la lista de categorías de arriba es una propuesta; el dueño debe confirmarla con su surtido real antes de darla por cerrada.
- **Idioma:** se asume sitio solo en español (mercado GT). Confirmar que no se requiere inglés en fase 1.
