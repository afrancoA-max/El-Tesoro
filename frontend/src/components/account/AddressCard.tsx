import { Address } from "@el-tesoro/shared";
import { Card, Badge, Button } from "@/components/ui";
import styles from "./AddressCard.module.css";

export interface AddressCardProps {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  busy?: boolean;
}

export function AddressCard({ address, onEdit, onDelete, onSetDefault, busy }: AddressCardProps) {
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <strong>{address.alias || address.nombreDestinatario}</strong>
        {address.esPredeterminada && <Badge variant="gold">Predeterminada</Badge>}
      </div>
      <p className={styles.line}>{address.nombreDestinatario}</p>
      <p className={styles.line}>{address.direccion}</p>
      <p className={styles.line}>
        {address.municipio}, {address.departamento}
      </p>
      {address.referencia && <p className={styles.line}>Referencia: {address.referencia}</p>}
      <p className={styles.line}>Tel. {address.telefono}</p>

      <div className={styles.actions}>
        <Button variant="outline" size="sm" onClick={onEdit} disabled={busy}>
          Editar
        </Button>
        {!address.esPredeterminada && (
          <Button variant="outline" size="sm" onClick={onSetDefault} disabled={busy}>
            Usar como predeterminada
          </Button>
        )}
        <Button variant="danger" size="sm" onClick={onDelete} disabled={busy}>
          Eliminar
        </Button>
      </div>
    </Card>
  );
}
