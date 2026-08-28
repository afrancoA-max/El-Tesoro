# Módulo 04 — Cuentas de usuario

## 1. Nombre y objetivo

**Cuentas de usuario.** Permitir que el cliente cree una cuenta opcional que le dé valor real (direcciones guardadas, historial de pedidos) y sentar la infraestructura de autenticación y roles que después usan el panel admin (08) y el portal B2B (11).

## 2. Alcance funcional

**Incluye:**

- Registro con correo y contraseña, verificación de correo, inicio/cierre de sesión, y recuperación de contraseña por correo.
- Perfil del usuario: datos personales, NIT para facturación (con opción "CF"), y libreta de direcciones de envío (crear/editar/eliminar, marcar predeterminada) restringida a Guatemala en fase 1 (departamento/municipio).
- Sección "Mis pedidos" — estructura y página listas, mostrando estado vacío; se llena de contenido real a partir del módulo 06.
- Infraestructura de autenticación reutilizable: emisión/validación de tokens, middleware de protección de rutas, y **modelo de roles desde el día uno** (`customer`, `admin`, `wholesale` — aunque `admin` y `wholesale` no tengan UI todavía).

**Decisión de diseño (justificada, ya tomada):** el **checkout de invitado queda habilitado** desde que exista el checkout (módulo 06). En el mercado guatemalteco, obligar a registrarse antes de pagar es de las principales causas de abandono; la cuenta se ofrece como opción al finalizar la compra ("crea tu contraseña para guardar este pedido"), convirtiendo compradores en cuentas sin fricción previa. Por eso este módulo NO es prerequisito del carrito (05), solo del checkout (06).

**Queda fuera:** login social (Google/Facebook) — evaluar post-lanzamiento; roles admin con su panel (08); cuentas mayoristas y su aprobación (11); cualquier vínculo con pedidos reales (06+).

## 3. Dependencias

- **02 API de catálogo** — necesita el backend y staging operativos (no depende del 03; puede construirse en paralelo con 03/05).

## 4. Skills involucradas

- `retail-backend-api-admin` — autenticación y roles (sección 3), validación y seguridad (8).
- `retail-frontend-react-components` — formularios y validación (9), manejo de estado de sesión (3), rutas protegidas (5).
- `retail-ux-design-system` — estados de formularios y accesibilidad (7); los formularios usan los primitivos del módulo 01.

## 5. Listo cuando…

- [ ] En staging: registrarse, recibir el correo de verificación, verificar, cerrar sesión y volver a entrar funciona de corrido con un correo real.
- [ ] "Olvidé mi contraseña" entrega un enlace de un solo uso que expira, y con él se cambia la contraseña.
- [ ] Un usuario puede guardar 2 direcciones (con departamento y municipio de Guatemala seleccionables de lista, no texto libre) y marcar una como predeterminada.
- [ ] Las rutas de perfil devuelven 401 sin sesión (API) y redirigen a login (frontend); un usuario no puede leer datos de otro cambiando IDs en la URL.
- [ ] Las contraseñas se almacenan con hash fuerte (verificable en la base: ningún texto plano) y los intentos de login fallidos se limitan (rate limit comprobable).
- [ ] El campo NIT valida el formato guatemalteco y acepta "CF".

## 6. Riesgos y decisiones pendientes

- **Proveedor de autenticación:** implementar propio (JWT + bcrypt en el backend) vs. Google Identity Platform/Firebase Auth. Recomendación: propio, para control total sobre roles B2B y sin dependencia extra; confirmar con el dueño antes de iniciar.
- **Proveedor de correo transaccional** (verificación, recuperación; luego lo reutilizan 06/07/10 para confirmaciones): SendGrid, Mailgun, Brevo o SMTP de Workspace. Decisión pendiente que conviene tomar aquí porque tres módulos posteriores lo heredan.
- **Datos mínimos de registro:** confirmar con el dueño si se pide teléfono desde el registro (útil para coordinación de entregas por WhatsApp, práctica común en GT) o solo en el checkout.
