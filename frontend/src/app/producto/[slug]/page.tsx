import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ProductViewer } from "@/components/product/ProductViewer";
import { RelatedCarousel } from "@/components/product/RelatedCarousel";
import { ErrorState } from "@/components/catalog/ErrorState";
import { getProduct } from "@/services/catalogService";
import { ApiError } from "@/services/api";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function loadProduct(slug: string) {
  try {
    return await getProduct(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug).catch(() => null);
  if (!product) return { title: `Producto | ${SITE_NAME}` };

  const description =
    product.descripcionCorta ??
    `${product.nombre}${product.marca ? ` de ${product.marca}` : ""} — disponible en Almacén El Tesoro, Guatemala.`;

  return {
    title: `${product.nombre} | ${SITE_NAME}`,
    description,
    alternates: { canonical: `${SITE_URL}/producto/${slug}` },
    openGraph: {
      title: product.nombre,
      description,
      images: product.imagenes[0] ? [product.imagenes[0].url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  let product;
  try {
    product = await loadProduct(slug);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : undefined;
    return (
      <main className={styles.main}>
        <ErrorState title="No pudimos cargar este producto" description={message} />
      </main>
    );
  }

  if (!product) notFound();

  const firstVariant = product.variantes[0];
  const disponible = product.variantes.some((v) => v.disponible);
  const precios = product.variantes.map((v) => Number(v.precio)).filter((p) => Number.isFinite(p));

  // CAT-07: con una sola variante, un `Offer` de un precio es correcto. Con
  // varias (tamaños/colores con precios distintos), Google espera un
  // `AggregateOffer` con el rango — un solo precio fijo sería incorrecto en
  // cuanto haya más de un precio real.
  const offers =
    product.variantes.length > 1
      ? {
          "@type": "AggregateOffer",
          url: `${SITE_URL}/producto/${product.slug}`,
          priceCurrency: "GTQ",
          lowPrice: precios.length > 0 ? Math.min(...precios) : 0,
          highPrice: precios.length > 0 ? Math.max(...precios) : 0,
          offerCount: product.variantes.length,
          availability: disponible ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        }
      : {
          "@type": "Offer",
          url: `${SITE_URL}/producto/${product.slug}`,
          priceCurrency: "GTQ",
          price: firstVariant?.precio ?? "0",
          availability: disponible ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        };

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nombre,
    image: product.imagenes.map((img) => img.url),
    description: product.descripcionCorta ?? product.descripcionLarga ?? product.nombre,
    sku: firstVariant?.sku,
    brand: product.marca ? { "@type": "Brand", name: product.marca } : undefined,
    offers,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: product.categoria.nombre,
        item: `${SITE_URL}/categoria/${product.categoria.slug}`,
      },
      { "@type": "ListItem", position: 3, name: product.nombre, item: `${SITE_URL}/producto/${product.slug}` },
    ],
  };

  return (
    <main className={styles.main}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <Breadcrumbs
        items={[
          { label: product.categoria.nombre, href: `/categoria/${product.categoria.slug}` },
          { label: product.nombre },
        ]}
      />

      <ProductViewer product={product} />

      {product.relacionados.length > 0 && (
        <section className={styles.related}>
          <h2 className={styles.relatedTitle}>Productos relacionados</h2>
          <RelatedCarousel products={product.relacionados} />
        </section>
      )}
    </main>
  );
}
