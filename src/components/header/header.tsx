"use client";

/**
 * `src/components/header/header.tsx`
 *
 * Propósito geral:
 * - Header global da aplicação.
 * - Exibe navegação para rotas protegidas e ações do usuário (perfil/logout).
 *
 * Regras de UI:
 * - Na rota `/login`, o header é renderizado “simplificado” (sem nav).
 * - O link de administração só aparece para usuários com role ADMIN.
 *
 * Dependências relevantes:
 * - `usePathname()` para destacar link ativo e identificar se está em `/login`.
 * - `useAuth()` para controlar visibilidade de itens restritos (ADMIN).
 */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, LogOut, Menu, X } from "lucide-react";
import "./header-hover.css";
import { useAuth } from "@/contexts/useAuth";

interface HeaderProps {
  loading?: boolean;
  logout?: () => void;
}

/**
 * Componente de header.
 *
 * Entrada:
 * - `logout`: callback disparado ao clicar no ícone de logout.
 * - `loading`: atualmente não é usado para condicionar UI aqui (mantido por compatibilidade).
 */
export default function Header({ logout }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAdmin } = useAuth();

  const currentPath = usePathname() || "/";
  const isLogin = currentPath === "/login";

  /** Marca a rota atual como ativa para aplicação de estilos. */
  const isActive = (path: string) => currentPath === path;

  const DADOS_PATH = "/protected/user";
  const ADMIN_PATH = "/protected/administrador";
  const TURMAS = "/protected/turmas";

  return (
    <header
      className={`header-obeci ${isLogin ? "login" : ""} ${menuOpen ? "open" : ""}`}
    >
      <div className="container-imagem-obeci">
        <img src="/logo-obeci.png" alt="Logo do projeto OBECI" />
      </div>

      {/* Se não for login, exibe o conteúdo do header */}
      {!isLogin && (
        <>
          <button
            className="menu-toggle"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>

          <nav className="nav-container">
            <div className="nav-links-group">
              <Link
                href={TURMAS}
                className={`nav-link ${isActive(TURMAS) ? "active" : ""}`}
              >
                Turmas
              </Link>
              {isAdmin && (
                <Link
                  href={ADMIN_PATH}
                  className={`nav-link ${isActive(ADMIN_PATH) ? "active" : ""}`}
                >
                  Administrar Acessos
                </Link>
              )}
            </div>

            <div className="icon-group">
              <div className="bloco-logout">
                <Link href={DADOS_PATH}>
                  <User size={28} />
                </Link>
              </div>
              <div className="bloco-logout" onClick={logout}>
                <LogOut size={28} />
              </div>
            </div>
          </nav>
        </>
      )}
    </header>
  );
}