"use client";

import { HeaderProps } from "@/types/types";
import "./header.css";
export default function Header({ loading = false, logout, user }: HeaderProps) {
  return (
    <header className="header-obeci">
      <div className="container-imagem-obeci">
        <img src="/logo-obeci.png" alt="Logo do projeto OBECI" />
      </div>

      <nav className="nav-vazia">
        <div className="bloco-logout">
          {/* Se loading não existe ou é true → não renderiza nada */}
          {!loading && user && logout && (
            <img
              src="/logout.svg"
              alt="Logout"
              style={{ cursor: "pointer" }}
              onClick={logout}
            />
          )}
        </div>
      </nav>
    </header>
  );
}
