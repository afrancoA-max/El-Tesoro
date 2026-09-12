"use client";

import { ProtectedRoute } from "@/components/account/ProtectedRoute";
import { AccountShell } from "@/components/account/AccountShell";
import { EmptyState } from "@/components/catalog/EmptyState";
import { LinkButton } from "@/components/ui";

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
          <LinkButton href="/" variant="outline" size="sm">
            Ir al catálogo
          </LinkButton>
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
