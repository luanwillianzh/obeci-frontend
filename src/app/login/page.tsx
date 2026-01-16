"use client";

/**
 * `src/app/login/page.tsx`
 *
 * Propósito geral:
 * - Tela de autenticação do usuário.
 * - Faz submit de credenciais via `useAuth().login` e redireciona para área protegida.
 *
 * Pontos críticos de lógica:
 * - Ao montar, chama `logout()` para tentar limpar cookie HttpOnly no backend (evita sessões “presas”).
 * - Exibe banner quando `sessionExpired` foi sinalizado em `localStorage` (setado por `Requests.me()`).
 * - Enquanto `loading` ou já existe `user`, retorna `null` para evitar flicker de UI.
 */
import Header from "@/components/header/header";
import "./loginpage.css";
import { useAuth } from "@/contexts/useAuth";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  /**
   * Dependências do contexto de autenticação.
   * - `login`: ação de autenticação
   * - `logout`: limpeza de sessão
   * - `user/loading`: estado global
   */
  const { login, user, loading, logout } = useAuth();
  const router = useRouter();

  /** Campos controlados do formulário. */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  /** Estados de UI: erro de login, submit em andamento e aviso de expiração de sessão. */
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  /**
   * Validação mínima do e-mail.
   * - `useMemo` evita recalcular regex a cada render sem necessidade.
   */
  const isEmailValid = useMemo(() => {
    const e = email.trim();
    if (!e) return false;
    // simples validação de e-mail
    return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(e);
  }, [email]);

  /** Regra de habilitação do submit. */
  const canSubmit = isEmailValid && password.trim().length > 0 && !isSubmitting;

  // Ao entrar na página de login, garantir limpeza do cookie HttpOnly no backend
  /**
   * Efeito de montagem:
   * - Tenta encerrar qualquer sessão anterior.
   *
   * Observação:
   * - A dependência é intencionalmente ignorada para rodar 1x (padrão “componentDidMount”).
   */
  useEffect(() => {
    (async () => {
      try {
        await logout();
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🚀 Se já tiver usuário logado, redireciona automaticamente
  /**
   * Se a sessão já está válida, evita mostrar login e navega direto.
   */
  useEffect(() => {
    if (!loading && user) {
      router.push("/protected/turmas");
    }
  }, [loading, user, router]);

  // Exibir aviso amigável quando a sessão expirar e o usuário for redirecionado
  /**
   * Lê flag de expiração de sessão.
   * - Essa flag é escrita em `Requests.me()` quando a API devolve 4xx.
   */
  useEffect(() => {
    try {
      const flag = localStorage.getItem("sessionExpired");
      if (flag === "1") {
        setSessionExpired(true);
        localStorage.removeItem("sessionExpired");
      }
    } catch {}
  }, []);

  /**
   * Handler do submit.
   *
   * Regras:
   * - Aborta se `canSubmit` for falso.
   * - Em sucesso, navega para `/protected/turmas`.
   * - Em erro, exibe mensagem vinda do provider (ou fallback).
   */
  const handleLogin = async () => {
    if (!canSubmit) return;
    setError("");
    setIsSubmitting(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        router.push("/protected/turmas");
      } else {
        setError(res.message || "Falha no login");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enquanto estiver carregando, não mostra nada
  if (loading || user) {
    return null;
  }

  return (
    <>
      <Header />
      <div className="container-login-page">
        <div className="container-imagem">
          <img src="./imagem-login.png" alt="imagem-login-obeci" />
        </div>
        <div className="container-login-pai">
          <div className="container-login">
            <h1>Login</h1>

            {sessionExpired && (
              <div
                className="session-expired-banner"
                role="status"
                aria-live="polite"
              >
                Sessão expirada. Faça login novamente.
                <span
                  className="dismiss"
                  onClick={() => setSessionExpired(false)}
                  role="button"
                  aria-label="Fechar aviso"
                >
                  Fechar
                </span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div className="bloco-form">
                <label className="label-input">Informe o seu e-mail</label>
                <input
                  type="email"
                  className="input-form-login"
                  placeholder="exemplo@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!isEmailValid && email.length > 0}
                />
              </div>

              <div className="bloco-form">
                <label className="label-input">Informe a sua senha</label>
                <input
                  type="password"
                  className="input-form-login"
                  placeholder="Escreva sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
             {/*    <div className="forgotpassword-button">Esqueci a senha</div> */}
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={!canSubmit}
              >
                {isSubmitting && <span className="spinner" aria-hidden />}
                <span className="button-text">
                  {isSubmitting ? "Entrando..." : "Entrar"}
                </span>
              </button>

              {error && (
                <p className="error-text" role="alert" aria-live="polite">
                  {error}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
