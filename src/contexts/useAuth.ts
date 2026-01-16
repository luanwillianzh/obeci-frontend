"use client";

/**
 * `useAuth`
 *
 * Propósito geral:
 * - Hook de conveniência para consumir `AuthContext` com tipagem forte e
 *   verificação de uso correto (dentro de `<AuthProvider>`).
 *
 * Efeito colateral:
 * - Lança erro em runtime caso o contexto esteja `null`.
 */
import { useContext } from "react";
import { AuthContext } from "./AuthContext";
import { AuthContextType } from "@/types/types";

/**
 * Obtém o contrato de autenticação exposto por `AuthProvider`.
 *
 * Saída:
 * - `AuthContextType` (nunca `null`).
 *
 * Exceções:
 * - Lança `Error` se chamado fora da árvore de `<AuthProvider>`.
 */
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  }

  return ctx;
}
