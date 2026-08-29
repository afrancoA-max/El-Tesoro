import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { FilterBar } from "@/components/catalog/FilterBar";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Pagination } from "@/components/catalog/Pagination";
import { ErrorState } from "@/components/catalog/ErrorState";
import { getCategoryProducts, getCategoryTree, findCategoryPath } from "@/services/catalogService";
import { ApiError } from "@/services/api";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

async function loadPath(slug: string) {
  const tree = await getCategoryTree();
  return findCategoryPath(tree, slug);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const path = await loadPath(slug).catch(() => undefined);
  const current = path?.at(-1);

  if (!current) {
    return { title: `Categoría | ${SITE_NAME}` };
  }

  const title = `${current.nombre} | ${SITE_NAME}`;
  const description =
    current.descripcion ??
    `Descubre ${current.nombre.toLowerCase()} de calidad para tu cocina y hogar en Almacén El Tesoro, Guatemala.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/categoria/${slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const page = Number(query.page ?? "1") || 1;
  const sort = (query.sort as "precio_asc" | "precio_desc" | "novedad" | undefined) ?? "novedad";
  const precioMin = query.precioMin ? Number(query.precioMin) : undefined;
  const precioMax = query.precioMax ? Number(query.precioMax) : undefined;
  const marca = query.marca || undefined;
  const material = query.material || undefined;
  const disponible = query.disponible === "true" ? true : undefined;

  let path;
  try {
    path = await loadPath(slug);
  } catch {
    return <ErrorState title="No pudimos cargar la categoría" />;
  }

  if (!path) notFound();
  const current = path.at(-1)!;

  let result;
  let facetsBrands: string[] = [];
  let facetsMateriales: string[] = [];
  try {
    [result] = await Promise.all([
      getCategoryProducts(slug, { page, sort, precioMin, precioMax, marca, material, disponible }),
    ]);
    const facetSource = await getCategoryProducts(slug, { limit: 100 });
    facetsBrands = Array.from(
      new Set(facetSource.items.map((item) => item.marca).filter((m): m is string => Boolean(m))),
    ).sort();
    facetsMateriales = Array.from(new Set(facetSource.items.flatMap((item) => item.materiales ?? []))).sort();
  } catch (error) {
    const message = error instanceof ApiError ? error.message : undefined;
    return <ErrorState title="No pudimos cargar los productos" description={message} />;
  }

  const breadcrumbItems = path.map((node, index) => ({
    label: node.nombre,
    href: index < path.length - 1 ? `/categoria/${node.slug}` : undefined,
  }));

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      ...path.map((node, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: node.nombre,
        item: `${SITE_URL}/categoria/${node.slug}`,
      })),
    ],
  };

  return (
    <main className={styles.main}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Breadcrumbs items={breadcrumbItems} />
      <h1 className={styles.title}>{current.nombre}</h1>
      {current.descripcion && <p className={styles.description}>{current.descripcion}</p>}

      <FilterBar marcasDisponibles={facetsBrands} materialesDisponibles={facetsMateriales} totalResultados={result.total} />
      <ProductGrid products={result.items} />
      <Pagination page={result.page} totalPages={result.totalPages} />
    </main>
  );
}
