"use client";
import Header from "@/components/header/header";
import "./loginpage.css";
import { useAuth } from "@/contexts/useAuth";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const { login, user, loading, logout } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const isEmailValid = useMemo(() => {
    const e = email.trim();
    if (!e) return false;
    // simples validação de e-mail
    return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(e);
  }, [email]);
  const canSubmit = isEmailValid && password.trim().length > 0 && !isSubmitting;

  // Ao entrar na página de login, garantir limpeza do cookie HttpOnly no backend
  useEffect(() => {
    (async () => {
      try {
        await logout();
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🚀 Se já tiver usuário logado, redireciona automaticamente
  useEffect(() => {
    if (!loading && user) {
      router.push("/protected/turmas");
    }
  }, [loading, user, router]);

  // Exibir aviso amigável quando a sessão expirar e o usuário for redirecionado
  useEffect(() => {
    try {
      const flag = localStorage.getItem("sessionExpired");
      if (flag === "1") {
        setSessionExpired(true);
        localStorage.removeItem("sessionExpired");
      }
    } catch {}
  }, []);

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
                <div className="forgotpassword-button">Esqueci a senha</div>
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
