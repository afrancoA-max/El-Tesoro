-- AlterTable
ALTER TABLE "products" ADD COLUMN     "disponible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "precioDesde" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "subtitulo" TEXT,
    "imagenUrl" TEXT NOT NULL,
    "enlace" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "banners_activo_orden_idx" ON "banners"("activo", "orden");

-- CreateIndex
CREATE INDEX "products_categoriaId_precioDesde_idx" ON "products"("categoriaId", "precioDesde");

-- CreateIndex
CREATE INDEX "products_categoriaId_disponible_idx" ON "products"("categoriaId", "disponible");
