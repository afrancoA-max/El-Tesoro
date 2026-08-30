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
  // Módulo 04 — Cuentas de usuario: el frontend y el backend son servicios
  // Cloud Run distintos, es decir dominios distintos bajo run.app (que está
  // en la lista pública de sufijos). Un fetch de cliente directo al backend
  // es cross-site, y Chrome no envía cookies SameSite=Lax en peticiones
  // cross-site — por eso "No autenticado" aparecía solo en navegadores
  // reales, no en herramientas de automatización con políticas más laxas.
  // Proxear /api/* a través del propio origen del frontend hace que, desde
  // el navegador, toda la sesión sea same-origin.
  async rewrites() {
    const target = process.env.API_PROXY_TARGET ?? "http://localhost:8080";
    return [{ source: "/api/:path*", destination: `${target}/api/:path*` }];
  },
};

export default nextConfig;
