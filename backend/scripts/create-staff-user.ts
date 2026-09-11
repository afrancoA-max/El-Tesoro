import type { Role } from "@el-tesoro/shared";
import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/utils/password";

// Crea o promueve una cuenta para probar /staff/inventario. Por defecto usa
// el rol "staff" (mínimo privilegio necesario); pasar --role=admin solo
// para cuentas que de verdad necesiten permisos de administrador.
// No hay UI todavía para dar de alta personal (pendiente del panel admin,
// módulo 08) — este script es la vía provisional.
//
// Uso:
//   npm run create-staff-user --workspace=backend -- --email=correo@eltesoro.gt --password=algo --nombre="Nombre" [--role=admin]

const ASSIGNABLE_ROLES: Role[] = ["staff", "admin"];

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
