"use client";

import { useAuth } from "@/contexts/useAuth";
import { redirect } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAdmin } = useAuth();

  // Exige login (reuso da lógica do layout protegido)
  if (!loading && !user) {
    redirect("/login");
  }

  // Exige perfil administrador
  if (!loading && user && !isAdmin) {
    // Redireciona para uma área padrão autenticada
    redirect("/protected/turmas");
  }

  return <>{loading ? "Carregando..." : children}</>;
}
