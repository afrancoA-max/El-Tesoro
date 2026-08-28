import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite probar el servidor de desarrollo desde el celular en la misma
  // red WiFi (http://<ip-de-esta-máquina>:3000). Sin esto, Next.js bloquea
  // los chunks de JS para cualquier origen que no sea localhost: la página
  // se ve (HTML/CSS ya vino del servidor) pero React nunca hidrata, así
  // que ningún botón responde. Si tu IP local cambia, agrégala aquí.
  allowedDevOrigins: ["192.168.0.154"],
};

export default nextConfig;
