import { Metadata } from "next";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Pagination } from "@/components/catalog/Pagination";
import { ErrorState } from "@/components/catalog/ErrorState";
import { EmptyState } from "@/components/catalog/EmptyState";
import { searchProducts } from "@/services/catalogService";
import { ApiError } from "@/services/api";
import { SITE_NAME } from "@/lib/site";
import styles from "./page.module.css";

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

// Búsqueda simple (fase 1, ver docs/plan/03-catalogo-navegable.md sección 6):
// noindex porque combina texto libre con paginación — no aporta valor de
// indexación propio y evita contenido duplicado (ver retail-seo-performance
// sección 1).
export const metadata: Metadata = {
  title: `Resultados de búsqueda | ${SITE_NAME}`,
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: PageProps) {
  const { q, page: pageParam } = await searchParams;
  const query = (q ?? "").trim();
  const page = Number(pageParam ?? "1") || 1;

  if (query.length < 2) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>Buscar</h1>
        <EmptyState
          title="Escribe al menos 2 letras"
          description="Usa el buscador del encabezado para encontrar productos por nombre."
        />
      </main>
    );
  }

  let result;
  try {
    result = await searchProducts(query, { page });
  } catch (error) {
    const message = error instanceof ApiError ? error.message : undefined;
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>Buscar</h1>
        <ErrorState title="No pudimos completar la búsqueda" description={message} />
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Resultados para &ldquo;{query}&rdquo;</h1>
      <p className={styles.count}>
        {result.total} {result.total === 1 ? "producto encontrado" : "productos encontrados"}
      </p>
      <ProductGrid
        products={result.items}
        emptyTitle={`Sin resultados para "${query}"`}
        emptyDescription="Revisa la ortografía o intenta con otra palabra clave."
      />
      <Pagination page={result.page} totalPages={result.totalPages} />
    </main>
  );
}
