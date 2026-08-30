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
  precioUnitario: number;
  precioCambio: boolean;
  disponible: boolean;
  stockDisponible: number;
  stockLimitado: boolean;
  subtotal: number;
}

export interface Cart {
  id: string | null;
  items: CartItem[];
  subtotal: number;
  totalUnidades: number;
}
