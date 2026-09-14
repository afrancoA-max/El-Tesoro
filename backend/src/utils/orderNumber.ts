import type { Prisma, PrismaClient } from "@prisma/client";

type TxClient = Prisma.TransactionClient | PrismaClient;

/// Correlativo legible `AET-2026-00001` (docs/plan/06-checkout.md sección 2).
/// Un contador por año (`order_counters`) incrementado dentro de la MISMA
/// transacción que crea la orden — dos checkouts simultáneos no pueden
/// terminar con el mismo número porque la fila del año queda bloqueada por
/// la transacción que llega primero (UPDATE ... RETURNING sobre una fila
/// existente toma un lock de fila; la segunda transacción espera).
export async function nextOrderNumber(tx: TxClient, now: Date = new Date()): Promise<string> {
  const anio = now.getFullYear();

  await tx.orderCounter.upsert({
    where: { anio },
    create: { anio, ultimo: 1 },
    update: { ultimo: { increment: 1 } },
  });

  const counter = await tx.orderCounter.findUniqueOrThrow({ where: { anio } });

  return `AET-${anio}-${String(counter.ultimo).padStart(5, "0")}`;
}
