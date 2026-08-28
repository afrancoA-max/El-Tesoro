---
name: retail-catalog-data-model
description: Modelado de datos del catálogo de productos para la tienda de hogar (categorías, subcategorías, productos, variantes, atributos como material/tamaño/color/capacidad) e inventario. Úsala SIEMPRE que se defina o modifique la estructura de categorías, el esquema de base de datos de productos, las reglas de variantes/SKU, el manejo de stock/inventario, o relaciones entre productos (combos, relacionados, "compra junto a esto"). No la uses para exponer estos datos vía API (usa retail-backend-api-admin), para decidir cómo se ven visualmente (usa retail-ux-design-system), ni para el código de componentes React que los consume (usa retail-frontend-react-components) — esta skill define el QUÉ y CÓMO se estructuran y almacenan los datos, no cómo se sirven ni se muestran.
---

# Retail Hogar E-commerce — Modelo de Datos del Catálogo

Esta skill define la estructura de datos del catálogo: taxonomía de categorías, modelo de producto y variantes, atributos propios del nicho (cocina/hogar), inventario y relaciones entre productos. Es la fuente de verdad que consumen `retail-backend-api-admin` (para exponerla vía API), `retail-frontend-react-components` (para consumirla) y `retail-cart-checkout` (para validar stock).

---

## 1. Decisión de base de datos (confirmar con el usuario antes de continuar)

El proyecto no ha fijado aún si se usará **Firestore** (NoSQL, nativo de Google Cloud) o **Cloud SQL con PostgreSQL** (relacional). Esta skill debe guiar esa decisión la primera vez que se trabaje en el proyecto y luego tratarla como fija.

| Criterio | Firestore | Cloud SQL (PostgreSQL) |
|---|---|---|
| Consultas con filtros combinados (categoría + precio + material + disponibilidad) | Limitado, requiere índices compuestos o Algolia/Elastic para búsqueda avanzada | Nativo con SQL, ideal para filtros de catálogo complejos |
| Relaciones (producto ↔ variantes ↔ categorías ↔ órdenes) | Requiere desnormalización manual | Integridad referencial nativa (foreign keys) |
| Transacciones de inventario (evitar sobreventa) | Soporta transacciones, pero más manual | Transacciones ACID robustas, ideal para control de stock |
| Escalabilidad/operación | Sin servidor, escalado automático | Requiere gestión de instancia (aunque Cloud SQL la simplifica) |
| Costo a baja escala | Muy bajo | Instancia mínima tiene costo fijo |

**Recomendación por defecto para este proyecto:** Cloud SQL (PostgreSQL), porque el catálogo tiene múltiples categorías, variantes con atributos combinables, y control de inventario transaccional — todo esto se beneficia de un modelo relacional. Si el usuario prioriza costo mínimo inicial o simplicidad operativa sobre filtros avanzados, Firestore es alternativa válida. **Esta skill asume PostgreSQL en los esquemas siguientes; si el usuario confirma Firestore, la sección 8 da las pautas de adaptación.**

---

## 2. Taxonomía de categorías

Estructura jerárquica de máximo 3 niveles (más profundidad complica la navegación, ver `retail-ux-design-system`):

```
Nivel 1 (Departamento)   → Cocina, Hogar, Cristalería y Menaje
Nivel 2 (Categoría)      → Ollas, Sartenes, Electrodomésticos pequeños, Utensilios, Vasos y Copas
Nivel 3 (Subcategoría)   → Ollas de acero inoxidable, Ollas de presión, Freidoras de aire, Licuadoras
```

Reglas:
- Una categoría de nivel 2 o 3 puede tener **múltiples padres** solo si el negocio lo requiere (ej. "Ollas de acero inoxidable" también listada bajo una colección "Aptas para inducción") — modelar como relación muchos-a-muchos aparte de la jerarquía principal (ver sección 4, `collections`).
- Cada categoría tiene: `slug` (URL amigable), `nombre`, `descripción` (para SEO, ver `retail-seo-performance`), `imagen_representativa` (para mega menú y home, ver `retail-ux-design-system`), `orden_visualización`.

---

## 3. Modelo de producto y variantes

Un **producto** es el concepto general (ej. "Sartén antiadherente línea Chef"); una **variante** es la combinación específica y vendible (ej. "Sartén Chef 24cm, color negro") — cada variante tiene su propio SKU, precio (puede diferir por variante) y stock independiente.

### Tabla `products`
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID/serial | PK |
| slug | string | único, para URL |
| nombre | string | |
| descripcion_corta | text | para tarjeta de producto |
| descripcion_larga | text | para página de producto, admite HTML/markdown básico |
| categoria_id | FK → categories | categoría principal |
| marca | string | nullable |
| especificaciones | jsonb | atributos técnicos no usados para filtrar (ver sección 5) |
| estado | enum | `activo`, `borrador`, `descontinuado` |
| fecha_creacion / fecha_actualizacion | timestamp | |

### Tabla `product_variants`
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID/serial | PK |
| product_id | FK → products | |
| sku | string | único, requerido para inventario y órdenes |
| precio | decimal | precio de venta actual |
| precio_comparativo | decimal | nullable, para mostrar descuento (precio "antes") |
| atributos | jsonb o tabla normalizada | ej. `{ "tamaño": "24cm", "color": "negro" }` — ver sección 5 |
| imagen_principal_id | FK → product_images | puede diferir por variante (ej. por color) |
| peso_kg / dimensiones | decimal/jsonb | para cálculo de envío en `retail-cart-checkout` |
| activo | boolean | permite desactivar una variante sin borrar el producto |

### Tabla `product_images`
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID/serial | PK |
| product_id o variant_id | FK | una imagen puede ser del producto general o de una variante específica |
| url | string | ruta en Cloud Storage (ver `retail-gcp-deployment-devops`) |
| orden | int | para galería ordenada |
| texto_alternativo | string | accesibilidad y SEO |

---

## 4. Colecciones y agrupaciones especiales

Para casos donde un producto debe aparecer en agrupaciones que no son la jerarquía de categorías (ej. "Novedades", "Aptas para inducción", "Set de regalo"):

### Tabla `collections`
| Campo | Tipo |
|---|---|
| id | UUID/serial |
| slug / nombre | string |
| tipo | enum: `manual`, `automatica` (por regla, ej. "todos los productos con descuento") |

### Tabla `product_collections` (muchos-a-muchos)
| product_id | collection_id |
|---|---|

---

## 5. Atributos y variantes — modelo recomendado

Para este nicho, los atributos que generan variantes son principalmente: **tamaño/capacidad, color, material**. Recomendación: modelo híbrido.

- **Atributos que generan variante** (afectan SKU/precio/stock: tamaño, color): tabla normalizada para poder filtrar eficientemente.

```
attribute_types: id, nombre ("Tamaño", "Color", "Material")
attribute_values: id, attribute_type_id, valor ("24cm", "Negro", "Acero inoxidable")
variant_attribute_values: variant_id, attribute_value_id   -- muchos-a-muchos
```

- **Especificaciones técnicas que NO generan variante** (ej. "apto para inducción: sí/no", "capacidad en litros", "potencia en watts" de un electrodoméstico): campo `especificaciones` tipo `jsonb` en `products`, mostrado en la página de producto pero no usado para filtros de catálogo con la misma prioridad que tamaño/color.

Esta separación evita que el catálogo genere una explosión de variantes innecesarias y mantiene rápidos los filtros más usados (ver `retail-ux-design-system`, sección de filtros).

---

## 6. Inventario y control de stock

### Tabla `inventory`
| Campo | Tipo | Notas |
|---|---|---|
| variant_id | FK → product_variants | PK compuesta si hay multi-bodega |
| cantidad_disponible | int | stock vendible |
| cantidad_reservada | int | reservado por órdenes en proceso de pago (ver regla de reserva abajo) |
| umbral_stock_bajo | int | para alertas en el panel admin |
| bodega_id | FK, opcional | si el negocio maneja más de una bodega/sucursal |

**Regla crítica de reserva de stock:** al iniciar el checkout (`retail-cart-checkout`), la cantidad solicitada se mueve de `cantidad_disponible` a `cantidad_reservada` dentro de una transacción, con un tiempo de expiración (ej. 15 minutos) si el pago no se confirma. Al confirmarse el pago (`retail-payments-integration`), se descuenta definitivamente; si expira o falla, se libera de vuelta a `cantidad_disponible`. Esta lógica de negocio se implementa en `retail-backend-api-admin`, pero el modelo de datos aquí debe soportarla con estos dos campos separados — nunca un solo campo de "stock".

---

## 7. Relaciones entre productos

### Tabla `product_relations`
| product_id | related_product_id | tipo |
|---|---|---|
| ... | ... | `relacionado`, `complementario`, `parte_de_set` |

- `relacionado`: "También te puede interesar" (misma categoría, alternativas).
- `complementario`: "Compra junto a esto" (ej. sartén → espátula de la misma línea) — usado en la página de producto y potencialmente en el carrito.
- `parte_de_set`: cuando un producto es vendible individualmente pero también existe como parte de un combo/set con su propio SKU.

---

## 8. Adaptación si el usuario confirma Firestore en lugar de PostgreSQL

Si se decide Firestore, mantener el mismo modelo conceptual con estos ajustes:
- Colecciones de nivel superior: `products`, `categories`, `collections`.
- Variantes como **subcolección** de cada producto (`products/{productId}/variants/{variantId}`) o como arreglo embebido si el número de variantes por producto es bajo (<10) — evaluar con el usuario según el catálogo real.
- Atributos de variante como mapa embebido dentro del documento de variante (no tabla normalizada) — implica que los filtros combinados por atributo deben resolverse con índices compuestos de Firestore o delegarse a un servicio de búsqueda externo si el catálogo crece.
- Inventario: documento separado por variante con transacciones de Firestore (`runTransaction`) para la reserva de stock descrita en la sección 6 — Firestore sí soporta esto de forma nativa.

---

## 9. Convenciones de nomenclatura de datos

- `slug` siempre en minúsculas, sin acentos, separado por guiones (ej. `sarten-antiadherente-chef-24cm`).
- `sku` con formato consistente y legible internamente, ej. `SART-CHEF-24-NEG` (categoría-línea-tamaño-color abreviado) — definir el formato exacto con el usuario/negocio y documentarlo aquí una vez fijado.
- Todos los precios se almacenan en la unidad monetaria menor o como decimal con 2 posiciones fijas — nunca como float de punto flotante impreciso.

---

## 10. Qué NO cubre esta skill

- Endpoints para exponer o modificar estos datos → `retail-backend-api-admin`.
- Presentación visual de filtros, tarjetas o galería → `retail-ux-design-system`.
- Componentes React que consumen esta data → `retail-frontend-react-components`.
- Lógica de reserva/descuento de stock durante el pago (solo el modelo que la soporta) → `retail-cart-checkout` y `retail-payments-integration`.
