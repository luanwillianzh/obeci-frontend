"use client";

import { useEffect } from "react";
import Header from "@/components/header/header";
import { useAuth } from "@/contexts/useAuth";
import { useRouter } from "next/navigation";
import "@/app/globals.css";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

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