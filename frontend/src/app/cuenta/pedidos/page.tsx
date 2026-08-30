"use client";

import { ProtectedRoute } from "@/components/account/ProtectedRoute";
import { AccountShell } from "@/components/account/AccountShell";
import { EmptyState } from "@/components/catalog/EmptyState";
import { Button } from "@/components/ui";
import Link from "next/link";

// Estructura y página listas mostrando el estado vacío (checklist del
// Módulo 04). El listado real de pedidos llega con el Módulo 06 —
// mientras tanto no hay endpoint que valga la pena consultar, así que esto
// no depende de la API.
function PedidosContent() {
  return (
    <AccountShell title="Mis pedidos">
      <EmptyState
        title="Todavía no tienes pedidos"
        description="Cuando compres en Almacén El Tesoro, tu historial aparecerá aquí."
        action={
          <Link href="/">
            <Button variant="outline" size="sm">
              Ir al catálogo
            </Button>
          </Link>
        }
      />
    </AccountShell>
  );
}

export default function PedidosPage() {
  return (
    <ProtectedRoute>
      <PedidosContent />
    </ProtectedRoute>
  );
}
