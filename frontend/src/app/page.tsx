import { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { CategoryShowcase, CategoryShowcaseItem } from "@/components/home/CategoryShowcase";
import { TrustBadges } from "@/components/home/TrustBadges";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { ErrorState } from "@/components/catalog/ErrorState";
import { getCategoryTree, getCategoryProducts } from "@/services/catalogService";
import { ProductListItem } from "@/lib/api-types";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: `${SITE_NAME} — Ollas, sartenes, electrodomésticos y cristalería en Guatemala`,
  description:
    "Almacén El Tesoro: ollas, sartenes, electrodomésticos pequeños, cristalería y menaje de mesa para tu cocina y tu hogar, con envíos en Guatemala.",
  alternates: { canonical: SITE_URL },
};

async function loadHomeData() {
  const tree = await getCategoryTree();
  const departments = tree.slice(0, 6);

  const departmentProducts = await Promise.all(
    departments.map((department) =>
      getCategoryProducts(department.slug, { limit: 6, sort: "novedad" }).catch(() => null),
    ),
  );

  const showcaseItems: CategoryShowcaseItem[] = departments.map((department, index) => ({
    slug: department.slug,
    nombre: department.nombre,
    imagen: departmentProducts[index]?.items.find((item) => item.imagenPrincipal)?.imagenPrincipal ?? null,
  }));

  const heroImages = showcaseItems.map((item) => item.imagen).filter((img): img is string => Boolean(img));

  const novedades: ProductListItem[] = departmentProducts
    .filter((result): result is NonNullable<typeof result> => Boolean(result))
    .flatMap((result) => result.items.slice(0, 3))
    .slice(0, 10);

  return {
    primaryCategorySlug: departments[0]?.slug,
    heroImages,
    showcaseItems,
    novedades,
  };
}

export default async function HomePage() {
  let data;
  try {
    data = await loadHomeData();
  } catch {
    return (
      <main className={styles.main}>
        <ErrorState title="No pudimos cargar la tienda" description="Intenta recargar la página en un momento." />
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <Hero images={data.heroImages} primaryCategorySlug={data.primaryCategorySlug} />
      <CategoryShowcase items={data.showcaseItems} />
      {data.novedades.length > 0 && (
        <section className={styles.novedades}>
          <h2 className={styles.novedadesTitle}>Novedades</h2>
          <ProductGrid products={data.novedades} />
        </section>
      )}
      <TrustBadges />
    </main>
  );
}
