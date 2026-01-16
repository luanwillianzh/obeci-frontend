/**
 * `src/app/layout.tsx`
 *
 * Propósito geral:
 * - Layout raiz do App Router (Next.js).
 * - Define metadata global (title/description/favicon).
 * - Registra fontes e estilos globais.
 * - Envolve toda a aplicação com `AuthProvider` para disponibilizar autenticação.
 *
 * Observações:
 * - Este arquivo roda como Server Component por padrão (não há "use client").
 * - O `AuthProvider` é um Client Component e serve como boundary para hooks do browser.
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/contexts/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Obeci",
  description: "OBECI Frontend",
  icons: {
    icon: "/favicon-obeci.jpg",
  },
};

/**
 * Layout raiz.
 *
 * Entrada:
 * - `children`: árvore de rotas.
 *
 * Saída:
 * - HTML base com `<AuthProvider>`.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
