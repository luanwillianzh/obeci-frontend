/**
 * `AuthContext`
 *
 * Propósito geral:
 * - Centralizar o estado de autenticação (usuário, loading) e as ações (login/logout)
 *   para consumo por qualquer componente do App.
 *
 * Observação:
 * - O contexto é criado com `null` por padrão. O hook `useAuth()` garante em runtime
 *   que o acesso só ocorre dentro de `<AuthProvider>`.
 */
import { AuthContextType } from "@/types/types";
import { createContext } from "react";

/**
 * Contexto tipado de autenticação.
 *
 * Entrada:
 * - Nenhuma.
 *
 * Saída:
 * - Um `React.Context<AuthContextType | null>`.
 */
export const AuthContext = createContext<AuthContextType | null>(null);
