import type { NextConfig } from "next";

// INF-08: el bucket de imágenes y la IP de desarrollo cambian por entorno
// (staging hoy, producción en el Módulo 09; la IP local, por máquina) —
// nunca deben quedar fijos en el código versionado.
const PRODUCT_IMAGES_BUCKET = process.env.PRODUCT_IMAGES_BUCKET ?? "eltesoro-product-images-staging";
const DEV_ORIGINS = (process.env.DEV_ALLOWED_ORIGINS ?? "192.168.0.154")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // Permite probar el servidor de desarrollo desde el celular en la misma
  // red WiFi (http://<ip-de-esta-máquina>:3000). Sin esto, Next.js bloquea
  // los chunks de JS para cualquier origen que no sea localhost: la página
  // se ve (HTML/CSS ya vino del servidor) pero React nunca hidrata, así
  // que ningún botón responde. Si tu IP local cambia, ponla en
  // DEV_ALLOWED_ORIGINS (.env.local), separada por comas si son varias.
  allowedDevOrigins: DEV_ORIGINS,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: `/${PRODUCT_IMAGES_BUCKET}/**`,
      },
    ],
  },
  output: "standalone",

  // SEG-09: cabeceras de seguridad básicas. Sin CSP estricta todavía (el
  // sitio carga imágenes de Cloud Storage y no hay inventario de todos los
  // orígenes externos aún) — X-Frame-Options ya evita el clickjacking, que
  // es el riesgo principal mientras tanto.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
