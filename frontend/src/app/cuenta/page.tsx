"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/account/ProtectedRoute";

function RedirectToProfile() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/cuenta/perfil");
  }, [router]);
  return null;
}

export default function CuentaIndexPage() {
  return (
    <ProtectedRoute>
      <RedirectToProfile />
    </ProtectedRoute>
  );
}
