import { prisma } from "../../src/config/prisma";

// Todas las tablas de aplicación (no las de Prisma migrate). TRUNCATE ...
// CASCADE en una sola sentencia es más simple y más rápido que borrar en
// orden de dependencias, y no falla si una tabla ya está vacía.
const TABLES = [
  "payment_events",
  "order_items",
  "orders",
  "order_counters",
  "shipping_rates",
  "settings",
  "cart_items",
  "carts",
  "banners",
  "product_collections",
  "collections",
  "product_relations",
  "variant_attribute_values",
  "attribute_values",
  "attribute_types",
  "product_images",
  "inventory",
  "product_variants",
  "products",
  "categories",
  "newsletter_subscribers",
  "refresh_tokens",
  "password_reset_tokens",
  "email_verification_tokens",
  "addresses",
  "users",
];

export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
