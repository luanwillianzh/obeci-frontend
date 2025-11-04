"use client";
import "./loginpage.css";
export default function Login() {
  return (
    <div className="container-login-page">
      <div className="container-imagem">
        <img src="./imagem-login.png" alt="imagem-login-obeci" />
      </div>
      <div className="container-login-pai">
        <div className="container-login">
          <h1>Login</h1>
          <div className="bloco-form">
            <label className="label-input" htmlFor="">
              Informe o seu e-mail
            </label>
            <input
              type="email"
              className="input-form-login"
              placeholder="exemplo@gmail.com"
              name="email"
            />
          </div>
          <div className="bloco-form">
            <label className="label-input" htmlFor="">
              Informe a sua senha
            </label>
            <input
              className="input-form-login"
              type="password"
              placeholder="Escreva sua senha"
              name="password"
            />
            <div className="forgotpassword-button">Esqueci a senha</div>
          </div>
          <div className="login-button">Entrar</div>
        </div>
      </div>
    </div>
  );
}
