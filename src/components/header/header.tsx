"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Bell, LogOut, Menu, X } from "lucide-react";
import "./header-hover.css";
import { useAuth } from "@/contexts/useAuth";

interface HeaderProps {
  loading?: boolean;
  logout?: () => void;
}

export default function Header({ loading = false, logout }: HeaderProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAdmin } = useAuth();

  const currentPath = usePathname() || "/";
  const isLogin = currentPath === "/login";

  // Se estiver na página de login, nunca expande por hover
  useEffect(() => {
    if (isLogin && isHovered) setIsHovered(false);
    if (isLogin && menuOpen) setMenuOpen(false);
  }, [isLogin, isHovered]);

  const isActive = (path: string) => currentPath === path;

  const DADOS_PATH = "/protected/user";
  const ADMIN_PATH = "/protected/administrador";
  const TURMAS = "/protected/turmas";
  const a = "/protected/administrador";

  return (
    <header
      className={`header-obeci ${isLogin ? "login" : ""} ${
        !isLogin && isHovered ? "hovered" : ""
      } ${menuOpen ? "open" : ""}`}
      onMouseEnter={() => {
        if (!isLogin) setIsHovered(true);
      }}
      onMouseLeave={() => {
        if (!isLogin) setIsHovered(false);
      }}
    >
      <div className="container-imagem-obeci">
        <img src="/logo-obeci.png" alt="Logo do projeto OBECI" />
      </div>

      {/* Mobile toggle (hidden on login page) */}
      {!isLogin && (
        <button
          className="menu-toggle"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      )}

      <div className="icon-group">
        <div className="bloco-logout">
          <Link href={DADOS_PATH}>
            <User size={35} />
          </Link>
        </div>
        {/*  <div className="bloco-logout">
          <Bell size={35} />
        </div> */}
        <div className="bloco-logout" onClick={logout}>
          <LogOut size={35} />
        </div>
      </div>

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
    </header>
  );
}
