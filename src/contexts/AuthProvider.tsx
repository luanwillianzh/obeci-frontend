"use client";

/**
 * `src/contexts/AuthProvider.tsx`
 *
 * Propósito geral:
 * - Implementar o provider do `AuthContext` (estado global de autenticação).
 * - Coordenar:
 *   - login/logout (via `Requests`)
 *   - hidratação inicial da sessão (chamada a `/auth/me` no mount)
 *   - persistência local do usuário (localStorage) para uso em UI
 *
 * Pontos críticos de lógica:
 * - O projeto usa `credentials: "include"` no `fetch`, então o backend pode trabalhar
 *   com cookie HttpOnly de sessão.
 * - Ainda assim, este provider escreve o usuário em `localStorage` para manter
 *   dados de UI (nome/roles) e para tolerar refresh.
 * - Se `NEXT_PUBLIC_API_URL` não estiver definido, considera que não há API e mantém
 *   o estado como não autenticado.
 *
 * Dependências relevantes:
 * - `Requests` (camada de endpoints) em `src/contexts/ApiRequests.tsx`.
 * - `localStorage` (Web API) para persistência simples de `user`.
 */

import { useState, useEffect, ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import { Api, Requests } from "./ApiRequests";
import { AuthContextType, LoginResponse, User } from "@/types/types";

interface Props {
  children: ReactNode;
}

export default function AuthProvider({ children }: Props) {
  /**
   * Estado do usuário autenticado.
   * - `null` representa não autenticado.
   */
  const [user, setUser] = useState<User | null>(null);

  /**
   * Flag de carregamento da verificação de sessão inicial.
   * - Enquanto `true`, o UI pode evitar renderizar áreas protegidas.
   */
  const [loading, setLoading] = useState(true);

  // Login integrado com o backend
  // Produção: preferir cookie HttpOnly (não guardar token em localStorage).
  /**
   * Realiza login e, em seguida, tenta obter `roles` e dados do usuário via `/auth/me`.
   *
   * Entrada:
   * - `email`, `password`
   *
   * Saída:
   * - `LoginResponse` (união discriminada) para o UI apresentar erro/sucesso.
   *
   * Efeitos colaterais:
   * - Pode chamar `Requests.logout()` preventivamente para limpar cookies de sessão.
   * - Persiste `user` no `localStorage` e atualiza `state`.
   */
  const login = async (
    email: string,
    password: string
  ): Promise<LoginResponse> => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) {
        return {
          success: false,
          message:
            "Configuração ausente: defina NEXT_PUBLIC_API_URL em .env.local",
        };
      }
      // Antes de realizar login, garantir que qualquer cookie de sessão seja removido
      try {
        await Requests.logout();
      } catch {}

      const res = await Requests.login(email, password);

      if (!res.ok) {
        // Backend retorna texto em erro (401) ou JSON; tentamos ambos
        let message = "Credenciais inválidas";
        try {
          const text = await res.text();
          if (text) message = text;
        } catch {}
        return { success: false, message };
      }

      // Mesmo que o backend retorne o token no corpo por compatibilidade,
      // o ideal é confiar no cookie HttpOnly e não armazenar token em JS.
      const data = (await res.json()) as { token?: string; username: string };
      // Após login, buscar roles e dados do usuário autenticado no backend
      try {
        const meRes = await Requests.me();
        if (meRes.ok) {
          const me = (await meRes.json()) as {
            username: string;
            email: string;
            arrayRoles?: string[];
          };
          const userData: User = {
            email: me.email || email,
            name: me.username || data.username,
            roles: me.arrayRoles || [],
          };
          localStorage.setItem("user", JSON.stringify(userData));
          setUser(userData);
        } else {
          // Em qualquer 4xx, considerar sessão inválida e limpar estado
          localStorage.removeItem("user");
          setUser(null);
        }
      } catch (e) {
        // Em erro de rede manteremos sem user
        localStorage.removeItem("user");
        setUser(null);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: "Erro ao conectar com o servidor. Tente novamente.",
      };
    }
  };

  // Logout: solicita limpeza do cookie HttpOnly no backend
  /**
   * Encerra a sessão.
   *
   * Efeitos colaterais:
   * - Chama `/auth/logout` (quando há `NEXT_PUBLIC_API_URL`).
   * - Remove `user` do `localStorage` e limpa o state.
   */
  const logout = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (baseUrl) {
        await Requests.logout();
      }
    } catch {}
    localStorage.removeItem("user");
    setUser(null);
  };

  /**
   * Inicialização do provider:
   * - No mount, valida sessão chamando `/auth/me`.
   * - Se ok, popula `user` com `roles`.
   * - Em 4xx ou erro de rede, considera não autenticado.
   */
  useEffect(() => {
    const init = async () => {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (baseUrl) {
        try {
          const meRes = await Requests.me();
          if (meRes.ok) {
            const me = (await meRes.json()) as {
              username: string;
              email: string;
              arrayRoles?: string[];
            };
            const userData: User = {
              email: me.email,
              name: me.username,
              roles: me.arrayRoles || [],
            };
            localStorage.setItem("user", JSON.stringify(userData));
            setUser(userData);
            setLoading(false);
            return;
          } else {
            // Qualquer 4xx (401/403 etc.) deve invalidar sessão
            localStorage.removeItem("user");
            setUser(null);
            setLoading(false);
            return;
          }
        } catch {
          // Em erro de rede, não assumimos sessão
          localStorage.removeItem("user");
          setUser(null);
          setLoading(false);
          return;
        }
      }
      // Sem baseUrl: não há API, manter não logado
      localStorage.removeItem("user");
      setUser(null);
      setLoading(false);
    };
    init();
  }, []);

  /**
   * Valor do contexto consumido por componentes.
   *
   * Observação:
   * - `isAdmin`/`isProfessor` derivam de `user.roles`.
   * - `hasRole` normaliza a entrada em uppercase para facilitar uso no UI.
   */
  const value: AuthContextType = {
    user,
    login,
    logout,
    loading,
    isAdmin: !!user?.roles?.includes("ADMIN"),
    isProfessor: !!user?.roles?.includes("PROFESSOR"),
    hasRole: (role: string) => !!user?.roles?.includes(role.toUpperCase()),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
