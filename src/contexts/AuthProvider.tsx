"use client";

import { useState, useEffect, ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import { Api, Requests } from "./ApiRequests";
import { AuthContextType, LoginResponse, User } from "@/types/types";

interface Props {
  children: ReactNode;
}

export default function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Login integrado com o backend
  // Produção: preferir cookie HttpOnly (não guardar token em localStorage).
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
