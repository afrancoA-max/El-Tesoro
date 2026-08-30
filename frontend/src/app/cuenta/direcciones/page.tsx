"use client";

import { useEffect, useState, useCallback } from "react";
import { Address } from "@el-tesoro/shared";
import { ProtectedRoute } from "@/components/account/ProtectedRoute";
import { AccountShell } from "@/components/account/AccountShell";
import { AddressForm } from "@/components/account/AddressForm";
import { AddressCard } from "@/components/account/AddressCard";
import { EmptyState } from "@/components/catalog/EmptyState";
import { ErrorState } from "@/components/catalog/ErrorState";
import { Button, Modal, Skeleton } from "@/components/ui";
import {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  AddressInput,
} from "@/services/accountApi";
import styles from "./page.module.css";

function DireccionesContent() {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Address | undefined>(undefined);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const { items } = await listAddresses();
      setAddresses(items);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(undefined);
    setModalOpen(true);
  }

  function openEdit(address: Address) {
    setEditing(address);
    setModalOpen(true);
  }

  async function handleSave(input: AddressInput) {
    if (editing) {
      await updateAddress(editing.id, input);
    } else {
      await createAddress(input);
    }
    setModalOpen(false);
    await load();
  }

  async function handleDelete(address: Address) {
    if (!window.confirm(`¿Eliminar la dirección "${address.alias || address.nombreDestinatario}"?`)) return;
    setBusyId(address.id);
    try {
      await deleteAddress(address.id);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleSetDefault(address: Address) {
    setBusyId(address.id);
    try {
      await setDefaultAddress(address.id);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AccountShell title="Mis direcciones">
      <div className={styles.toolbar}>
        <Button onClick={openCreate}>Agregar dirección</Button>
      </div>

      {addresses === null && !loadError && (
        <div className={styles.grid}>
          <Skeleton style={{ height: 180 }} />
          <Skeleton style={{ height: 180 }} />
        </div>
      )}

      {loadError && <ErrorState title="No pudimos cargar tus direcciones" onRetry={load} />}

      {addresses !== null && addresses.length === 0 && (
        <EmptyState
          title="Aún no tienes direcciones guardadas"
          description="Agrega una dirección para agilizar tus próximas compras."
        />
      )}

      {addresses !== null && addresses.length > 0 && (
        <div className={styles.grid}>
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              busy={busyId === address.id}
              onEdit={() => openEdit(address)}
              onDelete={() => handleDelete(address)}
              onSetDefault={() => handleSetDefault(address)}
            />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar dirección" : "Nueva dirección"}>
        <AddressForm initial={editing} onSubmit={handleSave} onCancel={() => setModalOpen(false)} />
      </Modal>
    </AccountShell>
  );
}

export default function DireccionesPage() {
  return (
    <ProtectedRoute>
      <DireccionesContent />
    </ProtectedRoute>
  );
}
