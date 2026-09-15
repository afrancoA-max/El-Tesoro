import type { Role } from "@el-tesoro/shared";
import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/utils/password";

// Crea o promueve una cuenta de personal interno. Por defecto usa el rol
// "staff" (mínimo privilegio necesario); pasar --role=admin/operador/
// servicio_cliente según a quién se le esté dando de alta.
// Módulo 08: "Mantenimiento de usuarios" (/admin/usuarios) es ahora la vía
// normal para dar de alta admin/staff/operador/servicio_cliente — este
// script queda como respaldo de arranque (el primer admin de un entorno
// nuevo, cuando todavía no hay nadie que pueda entrar al panel a crearlo).
//
// Uso:
//   npm run create-staff-user --workspace=backend -- --email=correo@eltesoro.gt --password=algo --nombre="Nombre" [--role=admin|staff|operador|servicio_cliente]

const ASSIGNABLE_ROLES: Role[] = ["staff", "admin", "operador", "servicio_cliente"];

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found?.slice(prefix.length);
}

function readRole(): Role {
  const raw = readArg("role") ?? "staff";
  if (!ASSIGNABLE_ROLES.includes(raw as Role)) {
    console.error(`--role debe ser uno de: ${ASSIGNABLE_ROLES.join(", ")} (recibido: "${raw}")`);
    process.exit(1);
  }
  return raw as Role;
}

async function main() {
  const email = readArg("email");
  const password = readArg("password");
  const nombre = readArg("nombre") ?? "Personal El Tesoro";
  const role = readRole();

  if (!email || !password) {
    console.error('Uso: --email=correo@eltesoro.gt --password=algo [--nombre="Nombre"] [--role=admin]');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { role, passwordHash, emailVerifiedAt: new Date() },
    create: { email, nombre, passwordHash, role, emailVerifiedAt: new Date() },
  });

  console.log(`Listo — ${user.email} ahora es ${role}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
