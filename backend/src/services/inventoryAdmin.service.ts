import { InventoryAdjustmentReason, Prisma } from "@prisma/client";
import type { AdminInventoryItemView, InventoryAdjustmentView } from "@el-tesoro/shared";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { normalizeText } from "../utils/normalizeText";
import { buildPaginatedResult, PaginatedResult, PaginationParams } from "../utils/pagination";

export interface InventoryListFilters {
  q?: string;
  soloStockBajo?: boolean;
}

export async function listAdminInventory(
  filters: InventoryListFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<AdminInventoryItemView>> {
  const where: Prisma.ProductVariantWhereInput = {
    ...(filters.q ? { OR: [{ sku: { contains: filters.q, mode: "insensitive" } }, { product: { busqueda: { contains: normalizeText(filters.q) } } }] } : {}),
  };

  const [variants, total] = await Promise.all([
    prisma.productVariant.findMany({
      where,
      include: { product: { include: { categoria: true } }, inventory: true },
      orderBy: { updatedAt: "desc" },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.productVariant.count({ where }),
  ]);

  let items: AdminInventoryItemView[] = variants.map((v) => {
    const cantidadDisponible = v.inventory?.cantidadDisponible ?? 0;
    const cantidadReservada = v.inventory?.cantidadReservada ?? 0;
    const umbralStockBajo = v.inventory?.umbralStockBajo ?? 0;
    return {
      variantId: v.id,
      sku: v.sku,
      productoNombre: v.product.nombre,
      productoSlug: v.product.slug,
      categoria: v.product.categoria.nombre,
      cantidadDisponible,
      cantidadReservada,
      umbralStockBajo,
      stockBajo: cantidadDisponible <= umbralStockBajo,
    };
  });

  // Filtro en memoria: "stock bajo" depende de comparar dos columnas de
  // tablas distintas (product_variants/inventory) por variante — más simple
  // de expresar así que en el `where` de Prisma, y el volumen de un almacén
  // no justifica optimizarlo con SQL crudo.
  if (filters.soloStockBajo) {
    items = items.filter((item) => item.stockBajo);
  }

  return buildPaginatedResult(items, filters.soloStockBajo ? items.length : total, pagination);
}

const MOTIVOS: InventoryAdjustmentReason[] = ["recepcion", "merma", "correccion"];

export function isValidAdjustmentReason(value: string): value is InventoryAdjustmentReason {
  return (MOTIVOS as string[]).includes(value);
}

/// Listo cuando (Módulo 08, punto 3): "Ajustar stock desde el admin se
/// refleja de inmediato en la disponibilidad del sitio y queda registrado
/// quién/cuándo/motivo." El UPDATE condicionado en la misma sentencia evita
/// que dos ajustes concurrentes dejen `cantidadDisponible` negativa (mismo
/// patrón que la reserva de stock del checkout, ver order.service.ts). El
/// trigger de Postgres de NUEVO-01 recalcula `Product.disponible` solo con
/// que esta fila cambie — no hay nada más que este service deba mantener.
export async function adjustStock(
  variantId: string,
  input: { delta: number; motivo: InventoryAdjustmentReason; notas?: string | null },
  adminUserId: string,
): Promise<InventoryAdjustmentView> {
  if (input.delta === 0) {
    throw AppError.badRequest("INVALID_DELTA", "El ajuste no puede ser cero.");
  }

  const inventory = await prisma.inventory.findUnique({ where: { variantId } });
  if (!inventory) throw AppError.notFound("VARIANT_NOT_FOUND", "No existe inventario para esa variante.");

  const result = await prisma.$transaction(async (tx) => {
    const affected = await tx.$executeRaw`
      UPDATE inventory
      SET "cantidadDisponible" = "cantidadDisponible" + ${input.delta}
      WHERE "variantId" = ${variantId} AND "cantidadDisponible" + ${input.delta} >= 0
    `;
    if (affected === 0) {
      throw AppError.conflict("NEGATIVE_STOCK", "Ese ajuste dejaría el stock disponible en negativo.");
    }

    const updated = await tx.inventory.findUniqueOrThrow({ where: { variantId } });

    const adjustment = await tx.inventoryAdjustment.create({
      data: {
        variantId,
        delta: input.delta,
        motivo: input.motivo,
        notas: input.notas ?? null,
        cantidadResultante: updated.cantidadDisponible,
        adminUserId,
      },
      include: { adminUser: true },
    });

    return adjustment;
  });

  return {
    id: result.id,
    variantId: result.variantId,
    delta: result.delta,
    motivo: result.motivo,
    cantidadResultante: result.cantidadResultante,
    adminNombre: result.adminUser.nombre,
    createdAt: result.createdAt.toISOString(),
  };
}

export async function listAdjustmentsForVariant(variantId: string): Promise<InventoryAdjustmentView[]> {
  const adjustments = await prisma.inventoryAdjustment.findMany({
    where: { variantId },
    include: { adminUser: true },
    orderBy: { createdAt: "desc" },
  });
  return adjustments.map((a) => ({
    id: a.id,
    variantId: a.variantId,
    delta: a.delta,
    motivo: a.motivo,
    cantidadResultante: a.cantidadResultante,
    adminNombre: a.adminUser.nombre,
    createdAt: a.createdAt.toISOString(),
  }));
}
