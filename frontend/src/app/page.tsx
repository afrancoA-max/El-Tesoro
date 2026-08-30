import { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { CategoryShowcase, CategoryShowcaseItem } from "@/components/home/CategoryShowcase";
import { TrustBadges } from "@/components/home/TrustBadges";
import { BrandsStrip } from "@/components/home/BrandsStrip";
import { Banner } from "@/components/home/Banner";
import { CategoryRail } from "@/components/home/CategoryRail";
import { NewsletterPopup } from "@/components/home/NewsletterPopup";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { ErrorState } from "@/components/catalog/ErrorState";
import { getCategoryTree, getCategoryProducts } from "@/services/catalogService";
import { CategoryNode, ProductListItem } from "@/lib/api-types";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import bannerGridStyles from "@/components/home/BannerGrid.module.css";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: `${SITE_NAME} — Ollas, sartenes, electrodomésticos y cristalería en Guatemala`,
  description:
    "Almacén El Tesoro: ollas, sartenes, electrodomésticos pequeños, cristalería y menaje de mesa para tu cocina y tu hogar, con envíos en Guatemala.",
  alternates: { canonical: SITE_URL },
};

interface DepartmentSection {
  department: CategoryNode;
  products: ProductListItem[];
}

async function loadHomeData() {
  const tree = await getCategoryTree();

  const productResults = await Promise.all(
    tree.map((department) => getCategoryProducts(department.slug, { limit: 10, sort: "novedad" }).catch(() => null)),
  );

  const sections: DepartmentSection[] = tree.map((department, index) => ({
    department,
    products: productResults[index]?.items ?? [],
  }));

  const showcaseItems: CategoryShowcaseItem[] = sections.map(({ department, products }) => ({
    slug: department.slug,
    nombre: department.nombre,
    imagen: products.find((item) => item.imagenPrincipal)?.imagenPrincipal ?? null,
  }));

  const heroImages = showcaseItems.map((item) => item.imagen).filter((img): img is string => Boolean(img));

  const novedades: ProductListItem[] = sections
    .flatMap(({ products }) => products.slice(0, 3))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const brands = Array.from(
    new Set(sections.flatMap(({ products }) => products.map((p) => p.marca).filter((m): m is string => Boolean(m)))),
  ).slice(0, 8);

  // Bloques con imagen para los banners: se toma de secciones distintas para
  // no repetir siempre la misma foto de producto.
  const bannerCandidates = sections.filter((s) => s.products.some((p) => p.imagenPrincipal));

  return {
    primaryCategorySlug: sections[0]?.department.slug,
    heroImages,
    showcaseItems,
    novedades,
    sections,
    brands,
    bannerCandidates,
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

  const [bannerA, bannerB, bannerC] = data.bannerCandidates;
  const bannerSlugs = new Set([bannerA, bannerB, bannerC].filter(Boolean).map((b) => b!.department.slug));
  const restSections = data.sections.filter((s) => !bannerSlugs.has(s.department.slug));

  return (
    <main className={styles.main}>
      <Hero images={data.heroImages} primaryCategorySlug={data.primaryCategorySlug} />

      <CategoryShowcase items={data.showcaseItems} />

      {bannerA && (
        <div className={styles.bannerFullWrap}>
          <Banner
            title={`Todo en ${bannerA.department.nombre}`}
            subtitle="Descubre la selección completa de esta categoría."
            ctaLabel="Ver categoría"
            href={`/categoria/${bannerA.department.slug}`}
            image={bannerA.products.find((p) => p.imagenPrincipal)?.imagenPrincipal ?? null}
            tone="navy"
            size="full"
          />
        </div>
      )}

      {data.novedades.length > 0 && (
        <section className={styles.novedades}>
          <h2 className={styles.novedadesTitle}>Novedades</h2>
          <ProductGrid products={data.novedades} />
        </section>
      )}

      {bannerB && bannerC && (
        <div className={bannerGridStyles.grid}>
          <Banner
            title={bannerB.department.nombre}
            ctaLabel="Explorar"
            href={`/categoria/${bannerB.department.slug}`}
            image={bannerB.products.find((p) => p.imagenPrincipal)?.imagenPrincipal ?? null}
            tone="gold"
            size="half"
          />
          <Banner
            title={bannerC.department.nombre}
            ctaLabel="Explorar"
            href={`/categoria/${bannerC.department.slug}`}
            image={bannerC.products.find((p) => p.imagenPrincipal)?.imagenPrincipal ?? null}
            tone="navy"
            size="half"
          />
        </div>
      )}

      {restSections.map(({ department, products }) => (
        <CategoryRail
          key={department.slug}
          title={department.nombre}
          viewAllHref={`/categoria/${department.slug}`}
          products={products}
        />
      ))}

      <TrustBadges />
      <BrandsStrip brands={data.brands} />

      <NewsletterPopup images={data.heroImages.slice(0, 4)} />
    </main>
  );
}
