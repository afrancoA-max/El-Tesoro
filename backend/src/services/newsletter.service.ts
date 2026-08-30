import { prisma } from "../config/prisma";

export interface NewsletterSubscribeInput {
  nombre: string;
  apellido: string;
  email: string;
}

/// Upsert por email: si alguien vuelve a suscribirse (ej. desde otro
/// dispositivo, o porque cerró el popup sin darse cuenta que ya estaba
/// suscrito) actualiza su nombre en vez de fallar con un error de
/// duplicado que no le aporta nada al usuario.
export async function subscribe(input: NewsletterSubscribeInput): Promise<void> {
  await prisma.newsletterSubscriber.upsert({
    where: { email: input.email },
    create: input,
    update: { nombre: input.nombre, apellido: input.apellido },
  });
}
