"use client";

import { useState, useEffect, ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import { AuthContextType, LoginResponse, User } from "@/types/types";

interface Props {
  children: ReactNode;
}

export default function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Login simulado
  const login = async (
    email: string,
    password: string
  ): Promise<LoginResponse> => {
    if (email === "admin@test.com" && password === "123") {
      const userData: User = { email, name: "Administrador" };

      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    }

    return { success: false, message: "Credenciais inválidas" };
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const value: AuthContextType = {
    user,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
