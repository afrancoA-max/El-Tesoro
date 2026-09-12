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
import { getCategoryTree, getCategoryProducts, getBanners } from "@/services/catalogService";
import { BannerSummary, CategoryNode, ProductListItem } from "@/lib/api-types";
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
  const [tree, banners] = await Promise.all([getCategoryTree(), getBanners().catch(() => [] as BannerSummary[])]);

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
    banners,
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

  // CAT-06: si hay banners administrados a mano (npm run manage-banners), se
  // usan esos en lugar de los bloques automáticos armados con fotos de
  // producto — mismos huecos visuales (uno ancho, luego pares a la mitad).
  // Sin ninguno configurado o vigente, el home cae al comportamiento
  // automático que ya tenía.
  const usingManualBanners = data.banners.length > 0;

  const [bannerA, bannerB, bannerC] = data.bannerCandidates;
  const bannerSlugs = usingManualBanners
    ? new Set<string>()
    : new Set([bannerA, bannerB, bannerC].filter(Boolean).map((b) => b!.department.slug));
  const restSections = data.sections.filter((s) => !bannerSlugs.has(s.department.slug));

  const [manualFull, ...manualRest] = data.banners;
  const manualHalfPairs: BannerSummary[][] = [];
  for (let i = 0; i < manualRest.length; i += 2) {
    manualHalfPairs.push(manualRest.slice(i, i + 2));
  }

  return (
    <main className={styles.main}>
      <Hero images={data.heroImages} primaryCategorySlug={data.primaryCategorySlug} />

      <CategoryShowcase items={data.showcaseItems} />

      {usingManualBanners
        ? manualFull && (
            <div className={styles.bannerFullWrap}>
              <Banner
                title={manualFull.titulo}
                subtitle={manualFull.subtitulo ?? undefined}
                ctaLabel="Ver más"
                href={manualFull.enlace}
                image={manualFull.imagenUrl}
                tone="navy"
                size="full"
              />
            </div>
          )
        : bannerA && (
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

      {usingManualBanners
        ? manualHalfPairs.map((pair, index) => (
            <div key={pair.map((b) => b.id).join("-") || index} className={bannerGridStyles.grid}>
              {pair.map((banner, i) => (
                <Banner
                  key={banner.id}
                  title={banner.titulo}
                  subtitle={banner.subtitulo ?? undefined}
                  ctaLabel="Ver más"
                  href={banner.enlace}
                  image={banner.imagenUrl}
                  tone={i === 0 ? "gold" : "navy"}
                  size="half"
                />
              ))}
            </div>
          ))
        : bannerB &&
          bannerC && (
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
