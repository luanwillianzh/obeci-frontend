"use client";

import Header from "@/components/header/header";
import { useAuth } from "@/contexts/useAuth";
import { redirect } from "next/navigation";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();

  // ❌ não some com layout inteiro
  if (!loading && !user) {
    redirect("/login");
  }

  return (
    <>
      <Header loading={loading} logout={logout} />
      <main>{loading ? "Carregando..." : children}</main>
    </>
  );
}
