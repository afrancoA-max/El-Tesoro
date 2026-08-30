import { z } from "zod";

// Tope arbitrario razonable para un carrito minorista — evita que un
// cliente (o un bot) intente agregar cantidades absurdas; el límite real
// siempre es el stock disponible, esto es solo un techo de forma.
const MAX_CANTIDAD = 99;

export const addCartItemSchema = z.object({
  variantId: z.string().uuid("Variante inválida."),
  cantidad: z.number().int().min(1, "La cantidad debe ser al menos 1.").max(MAX_CANTIDAD).default(1),
});

export const updateCartItemSchema = z.object({
  cantidad: z.number().int().min(1, "La cantidad debe ser al menos 1.").max(MAX_CANTIDAD),
});
