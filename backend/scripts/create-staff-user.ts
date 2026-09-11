import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/utils/password";

// Crea o promueve una cuenta a rol "admin" para probar /staff/inventario.
// No hay UI todavía para dar de alta personal (pendiente del panel admin,
// módulo 08) — este script es la vía provisional.
//
// Uso:
//   npm run create-staff-user --workspace=backend -- --email=correo@eltesoro.gt --password=algo --nombre="Nombre"

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found?.slice(prefix.length);
}

async function main() {
  const email = readArg("email");
  const password = readArg("password");
  const nombre = readArg("nombre") ?? "Personal El Tesoro";

  if (!email || !password) {
    console.error('Uso: --email=correo@eltesoro.gt --password=algo [--nombre="Nombre"]');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "admin", passwordHash, emailVerifiedAt: new Date() },
    create: { email, nombre, passwordHash, role: "admin", emailVerifiedAt: new Date() },
  });

  console.log(`Listo — ${user.email} ahora es admin.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
