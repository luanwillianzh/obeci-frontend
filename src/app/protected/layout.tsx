"use client";

/**
 * `src/app/protected/layout.tsx`
 *
 * Propósito geral:
 * - Layout de rotas protegidas.
 * - Implementa guard: se não houver usuário autenticado, redireciona para `/login`.
 * - Enquanto `loading`, exibe tela de carregamento (evita render parcial de telas protegidas).
 *
 * Dependências relevantes:
 * - `useAuth()` (contexto de autenticação).
 * - `useRouter()` (navegação imperativa no App Router).
 */

import { useEffect } from "react";
import Header from "@/components/header/header";
import { useAuth } from "@/contexts/useAuth";
import { useRouter } from "next/navigation";
import "@/app/globals.css";

/**
 * Layout das rotas em `/protected/*`.
 *
 * Entrada:
 * - `children`: conteúdo da rota protegida.
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  /**
   * Guard:
   * - Só redireciona quando `loading` termina.
   * - Usa `replace` para não poluir histórico com rota protegida inacessível.
   */
  useEffect(() => {
    // Só redireciona se o carregamento terminou e realmente não há usuário
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <>
        <Header loading={loading} logout={logout} />
        <div className="loading-screen-container">
          <div className="loading-content">
            <div className="spinner-obeci"></div>
            <h2 className="loading-text">Carregando...</h2>
          </div>
        </div>
      </>
    );
  }

  // Se chegou aqui, o usuário está logado
  return (
    <>
      <Header loading={loading} logout={logout} />
      <main>{children}</main>
    </>
  );
}