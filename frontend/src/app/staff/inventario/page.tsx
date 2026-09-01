"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { searchStaffInventory, fetchStaffInventoryByCategory, StaffInventoryItem } from "@/services/staffApi";
import { getCategoryTree } from "@/services/catalogService";
import { CategoryNode } from "@/lib/api-types";
import { ApiError } from "@/services/api";
import { formatCurrency } from "@/lib/format";
import { Input, Badge, Skeleton } from "@/components/ui";
import styles from "./page.module.css";

function stockBadge(item: StaffInventoryItem) {
  if (item.cantidadDisponible <= 0) return { variant: "danger" as const, label: "Agotado" };
  if (item.cantidadDisponible <= item.umbralStockBajo) return { variant: "gold" as const, label: "Stock bajo" };
  return { variant: "success" as const, label: "Disponible" };
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={styles.chevron}
      style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function InventoryCard({ item }: { item: StaffInventoryItem }) {
  const badge = stockBadge(item);
  return (
    <li className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.productName}>{item.productoNombre}</p>
          <p className={styles.meta}>
            {item.categoria}
            {item.marca ? ` · ${item.marca}` : ""}
          </p>
          {item.atributos && <p className={styles.meta}>{item.atributos}</p>}
          <p className={styles.sku}>SKU: {item.sku}</p>
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
      <div className={styles.cardFooter}>
        <span className={styles.price}>{formatCurrency(item.precio)}</span>
        <span className={styles.stock}>
          Existencias: <strong>{item.cantidadDisponible}</strong>
          {item.cantidadReservada > 0 && <span className={styles.reserved}> ({item.cantidadReservada} reservadas)</span>}
        </span>
      </div>
    </li>
  );
}

function CategoryAccordionItem({
  category,
  expanded,
  onToggle,
}: {
  category: CategoryNode;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [items, setItems] = useState<StaffInventoryItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El setLoading/setError inicial va dentro del .then() (no en el cuerpo
  // síncrono del efecto) por la misma razón que en FavoritesContext/UserContext:
  // react-hooks/set-state-in-effect exige que el setState quede en un
  // callback de promesa, no suelto en el efecto.
  useEffect(() => {
    if (!expanded || items !== null || loading) return;
    Promise.resolve()
      .then(() => {
        setLoading(true);
        setError(null);
        return fetchStaffInventoryByCategory(category.slug);
      })
      .then((result) => setItems(result.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la categoría."))
      .finally(() => setLoading(false));
  }, [expanded, items, loading, category.slug]);

  return (
    <li className={styles.categoryItem}>
      <button type="button" className={styles.categoryHeader} onClick={onToggle} aria-expanded={expanded}>
        <span>{category.nombre}</span>
        <ChevronIcon expanded={expanded} />
      </button>

      {expanded && (
        <div className={styles.categoryBody}>
          {loading && (
            <div className={styles.skeletonList}>
              <Skeleton style={{ height: 96 }} />
              <Skeleton style={{ height: 96 }} />
            </div>
          )}
          {!loading && error && <p className={styles.error}>{error}</p>}
          {!loading && !error && items && items.length === 0 && <p className={styles.empty}>Sin productos en esta categoría.</p>}
          {!loading && !error && items && items.length > 0 && (
            <ul className={styles.list}>
              {items.map((item) => (
                <InventoryCard key={item.variantId} item={item} />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function CategoryBrowser() {
  const [tree, setTree] = useState<CategoryNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  useEffect(() => {
    getCategoryTree()
      .then(setTree)
      .catch(() => setError("No se pudieron cargar las categorías."));
  }, []);

  if (error) return <p className={styles.error}>{error}</p>;

  if (!tree) {
    return (
      <div className={styles.skeletonList}>
        <Skeleton style={{ height: 52 }} />
        <Skeleton style={{ height: 52 }} />
        <Skeleton style={{ height: 52 }} />
      </div>
    );
  }

  return (
    <ul className={styles.categoryList}>
      {tree.map((category) => (
        <CategoryAccordionItem
          key={category.id}
          category={category}
          expanded={expandedSlug === category.slug}
          onToggle={() => setExpandedSlug((current) => (current === category.slug ? null : category.slug))}
        />
      ))}
    </ul>
  );
}

function SearchResults({ term }: { term: string }) {
  const [items, setItems] = useState<StaffInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await searchStaffInventory(term);
        setItems(result.items);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "No se pudo buscar. Intenta de nuevo.");
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [term]);

  if (loading) {
    return (
      <div className={styles.skeletonList}>
        <Skeleton style={{ height: 96 }} />
        <Skeleton style={{ height: 96 }} />
        <Skeleton style={{ height: 96 }} />
      </div>
    );
  }

  if (error) return <p className={styles.error}>{error}</p>;

  if (items.length === 0) return <p className={styles.empty}>No se encontraron productos para &ldquo;{term}&rdquo;.</p>;

  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <InventoryCard key={item.variantId} item={item} />
      ))}
    </ul>
  );
}

function InventoryConsole() {
  const [term, setTerm] = useState("");
  const trimmed = term.trim();
  const isSearching = trimmed.length >= 2;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>Consulta de precio y existencias</h1>
        <p className={styles.subtitle}>Búsqueda interna — solo personal de Almacén El Tesoro</p>
      </header>

      <Input
        type="search"
        inputMode="search"
        placeholder="Nombre, marca o SKU del producto…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        aria-label="Buscar producto"
      />

      {isSearching ? (
        <SearchResults term={trimmed} />
      ) : (
        <>
          <p className={styles.hint}>Elige una categoría para ver sus productos, o escribe arriba para buscar.</p>
          <CategoryBrowser />
        </>
      )}
    </main>
  );
}

export default function StaffInventoryPage() {
  const { user, status } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/cuenta/login?next=/staff/inventario");
      return;
    }
    if (status === "authenticated" && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [status, user, router]);

  if (status === "loading" || status === "unauthenticated" || (user && user.role !== "admin")) {
    return (
      <main className={styles.main}>
        <p className={styles.hint}>Verificando acceso…</p>
      </main>
    );
  }

  return <InventoryConsole />;
}
