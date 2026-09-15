-- CreateEnum
CREATE TYPE "FelStatus" AS ENUM ('pendiente', 'emitida', 'fallida');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "felEstado" "FelStatus" NOT NULL DEFAULT 'pendiente',
ADD COLUMN     "felNumeroDte" TEXT,
ADD COLUMN     "felPdfUrl" TEXT,
ADD COLUMN     "felUltimoError" TEXT,
ADD COLUMN     "pagoTransactionId" TEXT,
ADD COLUMN     "pagoUltimoError" TEXT;

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL DEFAULT 'cybersource',
    "eventId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "procesadoOk" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_events_orderId_idx" ON "payment_events"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_proveedor_eventId_key" ON "payment_events"("proveedor", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_pagoTransactionId_key" ON "orders"("pagoTransactionId");

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

