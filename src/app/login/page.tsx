"use client";
import Header from "@/components/header/header";
import "./loginpage.css";
import { useAuth } from "@/contexts/useAuth";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const { login, user, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // 🚀 Se já tiver usuário logado, redireciona automaticamente
  useEffect(() => {
    if (!loading && user) {
      router.push("/protected/turmas");
    }
  }, [loading, user, router]);

  const handleLogin = async () => {
    const res = await login(email, password);

    if (res.success) {
      router.push("/protected/turmas");
    } else {
      setError(res.message!);
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

            <div className="bloco-form">
              <label className="label-input">Informe o seu e-mail</label>
              <input
                type="email"
                className="input-form-login"
                placeholder="exemplo@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

            <div className="login-button" onClick={handleLogin}>
              Entrar
            </div>

            {error && <p style={{ color: "red" }}>{error}</p>}
          </div>
        </div>
      </div>
    </>
  );
}
