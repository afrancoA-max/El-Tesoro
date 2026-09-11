export interface CartItemAttribute {
  tipo: string;
  valor: string;
}

export interface CartItem {
  id: string;
  variantId: string;
  productSlug: string;
  nombre: string;
  sku: string;
  imagen: string | null;
  atributos: CartItemAttribute[];
  cantidad: number;
  // CAR-05: montos siempre como texto decimal fijo ("129.99"), igual que
  // `ProductVariant.precio` — nunca number, para no mezclar tipos de dinero
  // entre endpoints. Ver shared/src/money.ts.
  precioUnitario: string;
  precioAnteriorCongelado: string | null;
  precioCambio: boolean;
  disponible: boolean;
  stockDisponible: number;
  stockLimitado: boolean;
  subtotal: string;
}

export interface Cart {
  id: string | null;
  items: CartItem[];
  subtotal: string;
  totalUnidades: number;
}
