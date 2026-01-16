"use client";

/**
 * `src/app/not-found.tsx`
 *
 * Propósito geral:
 * - Tratamento de rota inexistente (404) no App Router.
 * - Em vez de exibir uma tela 404, redireciona conforme estado de autenticação:
 *   - Usuário autenticado -> `/protected/turmas`
 *   - Usuário não autenticado -> `/login`
 *
 * Observação:
 * - Como depende de `useAuth()` e `useRouter()`, este arquivo é Client Component.
 */
import { useEffect } from "react";
import { useAuth } from "@/contexts/useAuth";
import { useRouter } from "next/navigation";

/**
 * Componente de fallback para 404.
 *
 * Efeito colateral:
 * - Navegação imperativa via `router.replace(...)` após o término do loading.
 */
export default function NotFound() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/protected/turmas");
      } else {
        router.replace("/login");
      }
    }
  }, [loading, user, router]);

  return null;
}
