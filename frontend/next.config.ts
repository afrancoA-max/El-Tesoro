import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite probar el servidor de desarrollo desde el celular en la misma
  // red WiFi (http://<ip-de-esta-máquina>:3000). Sin esto, Next.js bloquea
  // los chunks de JS para cualquier origen que no sea localhost: la página
  // se ve (HTML/CSS ya vino del servidor) pero React nunca hidrata, así
  // que ningún botón responde. Si tu IP local cambia, agrégala aquí.
  allowedDevOrigins: ["192.168.0.154"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/eltesoro-product-images-staging/**",
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
