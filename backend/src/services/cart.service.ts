import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { generateOpaqueToken, hashOpaqueToken } from "../utils/tokens";

// Un carrito de invitado que lleva más de esto sin tocarse se trata como
// caducado (se descarta y se empieza uno nuevo) — mismo plazo que la cookie
// que lo referencia (confirmado con el negocio, docs/plan/05-carrito.md).
const CART_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface CartContext {
  userId?: string;
  rawCartToken?: string;
}

const cartWithDetails = Prisma.validator<Prisma.CartDefaultArgs>()({
  include: {
    items: {
      include: {
        variant: {
          include: {
            product: {
              select: { slug: true, nombre: true, estado: true, images: { orderBy: { orden: "asc" }, take: 1 } },
            },
            inventory: true,
            images: { orderBy: { orden: "asc" }, take: 1 },
            atributos: { include: { attributeValue: { include: { attributeType: true } } } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    },
  },
});
type CartWithDetails = Prisma.CartGetPayload<typeof cartWithDetails>;

export interface CartItemView {
  id: string;
  variantId: string;
  productSlug: string;
  nombre: string;
  sku: string;
  imagen: string | null;
  atributos: { tipo: string; valor: string }[];
  cantidad: number;
  precioUnitario: number;
  precioCambio: boolean;
  disponible: boolean;
  stockDisponible: number;
  stockLimitado: boolean;
  subtotal: number;
}

export interface CartView {
  id: string | null;
  items: CartItemView[];
  subtotal: number;
  totalUnidades: number;
}

function emptyCartView(): CartView {
  return { id: null, items: [], subtotal: 0, totalUnidades: 0 };
}

function toCartView(cart: CartWithDetails): CartView {
  const items: CartItemView[] = cart.items.map((item) => {
    const precioActual = Number(item.variant.precio);
    const precioCongelado = Number(item.precioUnitarioCongelado);
    const stockDisponible = item.variant.inventory?.cantidadDisponible ?? 0;
    const disponible = item.variant.activo && item.variant.product.estado === "activo" && stockDisponible > 0;

    return {
      id: item.id,
      variantId: item.variantId,
      productSlug: item.variant.product.slug,
      nombre: item.variant.product.nombre,
      sku: item.variant.sku,
      imagen: item.variant.images[0]?.url ?? item.variant.product.images[0]?.url ?? null,
      atributos: item.variant.atributos.map((a) => ({
        tipo: a.attributeValue.attributeType.nombre,
        valor: a.attributeValue.valor,
      })),
      cantidad: item.cantidad,
      precioUnitario: precioActual,
      // Comparado contra el precio congelado en el momento en que se agregó
      // o se tocó por última vez esta línea — no contra el precio de hace un
      // año, ver addItem/updateItemQuantity abajo.
      precioCambio: precioActual !== precioCongelado,
      disponible,
      stockDisponible,
      stockLimitado: item.cantidad > stockDisponible,
      subtotal: precioActual * item.cantidad,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalUnidades = items.reduce((sum, item) => sum + item.cantidad, 0);

  return { id: cart.id, items, subtotal, totalUnidades };
}

/// Busca el carrito activo del contexto (usuario o token de cookie) SIN
/// crear uno nuevo. Un visitante que nunca agregó nada no debe generar una
/// fila en `carts` solo por ver la página del carrito.
async function findCartId(ctx: CartContext): Promise<string | null> {
  if (ctx.userId) {
    const cart = await prisma.cart.findUnique({ where: { userId: ctx.userId } });
    return cart?.id ?? null;
  }

  if (ctx.rawCartToken) {
    const cart = await prisma.cart.findUnique({ where: { cartToken: hashOpaqueToken(ctx.rawCartToken) } });
    if (cart && Date.now() - cart.updatedAt.getTime() < CART_TOKEN_TTL_MS) return cart.id;
  }

  return null;
}

/// Igual que `findCartId`, pero crea el carrito si no existe (para
/// mutaciones que sí deben persistir algo). Si se crea uno anónimo nuevo,
/// devuelve el token crudo para que el controlador lo mande en cookie.
///
/// CAR-09(c): dos "Agregar" simultáneos del mismo usuario autenticado (sin
/// carrito todavía) pueden intentar crear su carrito (`userId` es
/// `@unique`) al mismo tiempo. En vez de dejar que el segundo reviente con
/// `P2002` (que `errorHandler` ya no convierte en 500, pero sigue siendo un
/// error visible para lo que era solo un doble clic), se recupera el
/// carrito que el primero acaba de crear.
async function resolveOrCreateCartId(ctx: CartContext): Promise<{ cartId: string; newCartToken?: string }> {
  const existingId = await findCartId(ctx);
  if (existingId) return { cartId: existingId };

  if (ctx.userId) {
    try {
      const created = await prisma.cart.create({ data: { userId: ctx.userId } });
      return { cartId: created.id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const winner = await prisma.cart.findUnique({ where: { userId: ctx.userId } });
        if (winner) return { cartId: winner.id };
      }
      throw error;
    }
  }

  const { raw, hash } = generateOpaqueToken();
  const created = await prisma.cart.create({ data: { cartToken: hash } });
  return { cartId: created.id, newCartToken: raw };
}

export async function getCart(ctx: CartContext): Promise<CartView> {
  const cartId = await findCartId(ctx);
  if (!cartId) return emptyCartView();
  return getCartView(cartId);
}

export async function getCartView(cartId: string): Promise<CartView> {
  const cart = await prisma.cart.findUnique({ where: { id: cartId }, ...cartWithDetails });
  if (!cart) return emptyCartView();
  return toCartView(cart);
}

async function getVariantForCart(variantId: string) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { estado: true } }, inventory: true },
  });

  if (!variant || !variant.activo || variant.product.estado !== "activo") {
    throw AppError.notFound("VARIANT_NOT_FOUND", "Este producto ya no está disponible.");
  }

  return variant;
}

/// Nunca confía en la cantidad pedida por el cliente frente al stock real:
/// el módulo de carrito solo VALIDA `cantidadDisponible` (no reserva — eso
/// es del Módulo 06, ver docs/plan/05-carrito.md sección 6). Si la cantidad
/// pedida excede el stock, se recorta al máximo disponible en vez de
/// rechazar de plano, salvo que ya no quede nada.
///
/// CAR-09(a): dos "Agregar" casi simultáneos a la misma línea ya no leen
/// `cantidad` y la vuelven a escribir (eso pierde una unidad si ambos leen
/// antes de que el otro escriba). El `upsert` de actualización usa
/// `increment`, que Postgres resuelve como una sola sentencia atómica por
/// fila — el segundo request espera a que el primero termine su
/// transacción y parte de la cantidad ya sumada, no de la que leyó antes.
export async function addItem(ctx: CartContext, variantId: string, cantidad: number): Promise<{ cart: CartView; newCartToken?: string; limitado: boolean }> {
  const variant = await getVariantForCart(variantId);
  const stockDisponible = variant.inventory?.cantidadDisponible ?? 0;

  if (stockDisponible <= 0) {
    throw AppError.badRequest("OUT_OF_STOCK", "Este producto no tiene stock disponible.");
  }

  const { cartId, newCartToken } = await resolveOrCreateCartId(ctx);

  const { limitado } = await prisma.$transaction(async (tx) => {
    const upserted = await tx.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId } },
      create: { cartId, variantId, cantidad: Math.min(cantidad, stockDisponible), precioUnitarioCongelado: variant.precio },
      update: { cantidad: { increment: cantidad }, precioUnitarioCongelado: variant.precio },
    });

    const excedido = upserted.cantidad > stockDisponible;
    if (excedido) {
      await tx.cartItem.update({ where: { id: upserted.id }, data: { cantidad: stockDisponible } });
    }

    // Toca `updatedAt` del carrito para reiniciar el conteo de caducidad de
    // 30 días de un carrito anónimo activo.
    await tx.cart.update({ where: { id: cartId }, data: { estado: "activo" } });

    return { limitado: excedido };
  });

  return { cart: await getCartView(cartId), newCartToken, limitado };
}

async function findOwnedItem(cartId: string, itemId: string) {
  const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
  // Mismo criterio que direcciones: "no existe" y "existe pero no es tuyo"
  // responden igual (404), para no filtrar carritos ajenos.
  if (!item || item.cartId !== cartId) {
    throw AppError.notFound("CART_ITEM_NOT_FOUND", "No existe esa línea en el carrito.");
  }
  return item;
}

export async function updateItemQuantity(ctx: CartContext, itemId: string, cantidad: number): Promise<CartView> {
  const cartId = await findCartId(ctx);
  if (!cartId) throw AppError.notFound("CART_ITEM_NOT_FOUND", "No existe esa línea en el carrito.");

  const item = await findOwnedItem(cartId, itemId);
  const variant = await getVariantForCart(item.variantId);
  const stockDisponible = variant.inventory?.cantidadDisponible ?? 0;

  if (stockDisponible <= 0) {
    throw AppError.badRequest("OUT_OF_STOCK", "Ya no hay stock disponible de este producto — elimínalo del carrito.");
  }

  const cantidadFinal = Math.min(cantidad, stockDisponible);

  await prisma.$transaction([
    prisma.cartItem.update({
      where: { id: itemId },
      data: { cantidad: cantidadFinal, precioUnitarioCongelado: variant.precio },
    }),
    prisma.cart.update({ where: { id: cartId }, data: { estado: "activo" } }),
  ]);

  return getCartView(cartId);
}

export async function removeItem(ctx: CartContext, itemId: string): Promise<CartView> {
  const cartId = await findCartId(ctx);
  if (!cartId) throw AppError.notFound("CART_ITEM_NOT_FOUND", "No existe esa línea en el carrito.");

  await findOwnedItem(cartId, itemId);
  await prisma.cartItem.delete({ where: { id: itemId } });

  return getCartView(cartId);
}

/// Fusión al iniciar sesión (docs/plan/05-carrito.md, sección 2): suma
/// cantidades de variantes duplicadas (recortadas a stock real), nunca
/// reemplaza en silencio el carrito de la cuenta. El carrito anónimo se
/// descarta después de fusionarse — el token ya no sirve para nada.
export async function mergeAnonymousCart(userId: string, rawCartToken: string | undefined): Promise<CartView> {
  const userCart = (await prisma.cart.findUnique({ where: { userId } })) ?? (await prisma.cart.create({ data: { userId } }));

  if (!rawCartToken) return getCartView(userCart.id);

  const anonCart = await prisma.cart.findUnique({
    where: { cartToken: hashOpaqueToken(rawCartToken) },
    include: { items: true },
  });

  if (!anonCart) return getCartView(userCart.id);

  if (anonCart.items.length === 0) {
    await prisma.cart.delete({ where: { id: anonCart.id } }).catch(() => undefined);
    return getCartView(userCart.id);
  }

  await prisma.$transaction(async (tx) => {
    for (const item of anonCart.items) {
      const [existing, inventory] = await Promise.all([
        tx.cartItem.findUnique({ where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } } }),
        tx.inventory.findUnique({ where: { variantId: item.variantId } }),
      ]);
      const stockDisponible = inventory?.cantidadDisponible ?? 0;
      const cantidadFinal = Math.min((existing?.cantidad ?? 0) + item.cantidad, stockDisponible);
      if (cantidadFinal <= 0) continue;

      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
        create: {
          cartId: userCart.id,
          variantId: item.variantId,
          cantidad: cantidadFinal,
          precioUnitarioCongelado: item.precioUnitarioCongelado,
        },
        update: { cantidad: cantidadFinal },
      });
    }

    // El cascade de Cart -> CartItem se encarga de las líneas del carrito
    // anónimo al borrarlo.
    await tx.cart.delete({ where: { id: anonCart.id } });
    await tx.cart.update({ where: { id: userCart.id }, data: { estado: "activo" } });
  });

  return getCartView(userCart.id);
}
