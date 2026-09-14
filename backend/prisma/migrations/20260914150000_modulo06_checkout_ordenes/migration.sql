-- Módulo 06 — Checkout: órdenes, reserva de stock y envío por departamento.

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pendiente_pago', 'pagado', 'en_preparacion', 'enviado', 'entregado', 'cancelado');

-- CreateEnum
CREATE TYPE "ShippingCarrier" AS ENUM ('cargo_expreso', 'forza');

-- CreateTable
CREATE TABLE "shipping_rates" (
    "id" TEXT NOT NULL,
    "transportista" "ShippingCarrier" NOT NULL,
    "departamento" TEXT NOT NULL,
    "costo" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "order_counters" (
    "anio" INTEGER NOT NULL,
    "ultimo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_counters_pkey" PRIMARY KEY ("anio")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "userId" TEXT,
    "invitadoEmail" TEXT,
    "invitadoTelefono" TEXT,
    "estado" "OrderStatus" NOT NULL DEFAULT 'pendiente_pago',
    "motivoCancelacion" TEXT,
    "facturacionNit" TEXT NOT NULL,
    "facturacionNombre" TEXT NOT NULL,
    "metodoEnvioCodigo" TEXT NOT NULL,
    "metodoEnvioNombre" TEXT NOT NULL,
    "direccionEnvio" JSONB,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "costoEnvio" DECIMAL(10,2) NOT NULL,
    "descuento" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "ivaIncluidoInformativo" DECIMAL(10,2) NOT NULL,
    "accessTokenHash" TEXT,
    "fechaExpiracionReserva" TIMESTAMP(3),
    "reservaLiberada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT,
    "nombreProducto" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "imagenUrl" TEXT,
    "atributos" JSONB,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipping_rates_transportista_departamento_key" ON "shipping_rates"("transportista", "departamento");

-- CreateIndex
CREATE UNIQUE INDEX "orders_numero_key" ON "orders"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "orders_accessTokenHash_key" ON "orders"("accessTokenHash");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_estado_fechaExpiracionReserva_idx" ON "orders"("estado", "fechaExpiracionReserva");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
