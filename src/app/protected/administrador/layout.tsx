"use client";

/**
 * `src/app/protected/administrador/layout.tsx`
 *
 * Propósito geral:
 * - Layout/guard de acesso para a área administrativa.
 *
 * Regras:
 * - Se não estiver autenticado: redireciona para `/login`.
 * - Se estiver autenticado mas não for ADMIN: redireciona para `/protected/turmas`.
 */
import { useEffect } from "react";
import { useAuth } from "@/contexts/useAuth";
import { useRouter } from "next/navigation";

/**
 * Layout wrapper do módulo administrador.
 *
 * Observação:
 * - Usa `redirect()` do Next (navegação imediata).
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  // Guard do módulo administrador (client-side), com UX consistente com o layout protegido.
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!isAdmin) {
      router.replace("/protected/turmas");
    }
  }, [user, loading, isAdmin, router]);

  // Enquanto valida permissões, mostra a mesma UI de loading do layout protegido.
  if (loading) {
    return (
      <div className="loading-screen-container">
        <div className="loading-content">
          <div className="spinner-obeci"></div>
          <h2 className="loading-text">Carregando...</h2>
        </div>
      </div>
    );
  }

  // Sem usuário ou sem permissão: o useEffect já disparou o replace.
  if (!user || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
