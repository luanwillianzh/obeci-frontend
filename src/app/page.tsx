"use client";

/**
 * `src/app/page.tsx`
 *
 * Propósito geral:
 * - Rota `/` (home) apenas como redirecionamento para a tela de login.
 *
 * Observação:
 * - `redirect()` do Next navega imediatamente; o `return null` é apenas para
 *   satisfazer a assinatura do componente.
 */
import { redirect } from "next/navigation";

/**
 * Componente de página da rota `/`.
 *
 * Efeito colateral:
 * - Redireciona para `/login`.
 */
export default function Home() {
  redirect("/login");
  return null;
}
