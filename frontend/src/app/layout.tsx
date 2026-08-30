import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getCategoryTree } from "@/services/catalogService";
import { CategoryNode } from "@/lib/api-types";
import { UserProvider } from "@/context/UserContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s` },
  description: "Productos para el hogar y la cocina en Guatemala.",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/eltesoro-logo.png`,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // La navegación (mega-menú, menú móvil, footer) se arma desde el árbol
  // real de categorías, nunca desde una lista fija en el código — así
  // aparecen/desaparecen departamentos automáticamente cuando cambian en el
  // catálogo (ver Módulo 03, corrección: antes mostraba un departamento
  // "Electrodomésticos" que no existe en los datos reales).
  let categoryTree: CategoryNode[] = [];
  try {
    categoryTree = await getCategoryTree();
  } catch {
    categoryTree = [];
  }

  return (
    <html lang="es" className={`${poppins.variable} ${inter.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <UserProvider>
          <FavoritesProvider>
            <Header categoryTree={categoryTree} />
            {children}
            <Footer categoryTree={categoryTree} />
          </FavoritesProvider>
        </UserProvider>
      </body>
    </html>
  );
}
