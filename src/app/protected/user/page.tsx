"use client";

/**
 * `src/app/protected/user/page.tsx`
 *
 * Propósito geral:
 * - Tela de dados do usuário autenticado:
 *   - Atualização de nome/e-mail
 *   - Redefinição de senha
 *   - Upload/preview local de foto (apenas no front; não persiste no backend)
 *
 * Pontos críticos:
 * - `foto` é mantida como DataURL em memória (FileReader) e exibida no UI.
 * - Atualizações reais persistidas via `Requests.updateMe`.
 */

import { useEffect, useState } from "react";
import { Upload, User, CheckCircle, AlertCircle } from "lucide-react";
import "./dados.css";
import { Requests } from "@/contexts/ApiRequests";

export default function AdministrarAcessos() {
  /** Estados controlados dos inputs. */
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  /** Foto em formato DataURL para preview (não persistida no backend neste código). */
  const [foto, setFoto] = useState<string | null>(null);

  /** Mensagens de feedback. */
  const [erroSenha, setErroSenha] = useState("");
  const [sucesso, setSucesso] = useState("");

  /** Carrega dados do usuário autenticado via `/auth/me`. */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await Requests.me();
        if (res.ok) {
          const me = (await res.json()) as { username: string; email: string };
          setNome(me.username || "");
          setEmail(me.email || "");
        }
      } catch {}
    };
    load();
  }, []);

  /**
   * Upload de arquivo local.
   * - Converte para DataURL para exibir preview.
   * - Não há envio para backend aqui (comportamento atual).
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Redefinição de senha do usuário autenticado.
  // Regras:
  // - validação básica no front (campos preenchidos, confirmação, min 6)
  // - validação final no back-end (pode retornar 400 com detalhes)
  // Feedback:
  // - sucesso aparece na própria tela
  // - erro aparece na própria tela com o motivo
  const handleRedefinirSenha = async () => {
    if (!novaSenha || !confirmarSenha) {
      setErroSenha("Preencha ambos os campos de senha");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErroSenha("As senhas não coincidem");
      return;
    }

    if (novaSenha.length < 6) {
      setErroSenha("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setErroSenha("");
    try {
      const res = await Requests.updateMe({ password: novaSenha });
      if (!res.ok) {
        // Backend pode retornar JSON (com errors[]) ou texto simples.
        let msg = "Falha ao atualizar senha";
        try {
          const data = await res.json();
          if (data?.errors && Array.isArray(data.errors)) {
            msg = data.errors.map((e: any) => e.message).join("\n");
          } else if (typeof data?.error === "string") {
            msg = data.error;
          }
        } catch {
          try {
            const txt = await res.text();
            if (txt) msg = txt;
          } catch {}
        }
        setErroSenha(msg);
        return;
      }
      setSucesso("Senha redefinida com sucesso!");
      setTimeout(() => {
        setSucesso("");
        setNovaSenha("");
        setConfirmarSenha("");
      }, 3000);
    } catch {
      setErroSenha("Erro ao conectar com o servidor");
    }
  };

  /**
   * Atualiza `username` e `email` do usuário autenticado.
   *
   * Observação:
   * - Aqui usa `alert()` para feedback de erro; poderia ser unificado com a UI de mensagens.
   */
  const handleAtualizarDados = async () => {
    if (!nome.trim() || !email.trim()) {
      alert("Nome e e-mail são obrigatórios");
      return;
    }
    try {
      const res = await Requests.updateMe({
        username: nome.trim(),
        email: email.trim(),
      });
      if (!res.ok) {
        const msg = await res.text();
        alert(msg || "Falha ao atualizar dados");
        return;
      }
      setSucesso("Dados atualizados com sucesso!");
      setTimeout(() => setSucesso(""), 3000);
    } catch {
      alert("Erro ao conectar com o servidor");
    }
  };

  return (
    <>
      <div className="background-principal">
        <div className="linha-vertical-central" />

        <div className="dados-container">
          <div className="bloco-dados">
            <h1 className="main-title">Dados Pessoais</h1>

            <div className="input-group">
              <label className="label-input">Nome Completo</label>
              <input
                type="text"
                className="input-form-data"
                placeholder="Seu Nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="label-input">E-mail</label>
              <input
                type="email"
                className="input-form-data"
                placeholder="exemplo@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="foto-perfil-container">
              <div className="foto-placeholder">
                {foto ? (
                  <img
                    src={foto}
                    alt="Foto de Perfil"
                    className="foto-perfil-img"
                  />
                ) : (
                  <User size={80} color="#6d6d6d" />
                )}
              </div>

              <label
                htmlFor="file-upload"
                className="save-button upload-button-custom"
              >
                <Upload size={20} />
                {foto ? "Trocar Foto" : "Fazer Upload"}
              </label>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="input-upload-hidden"
              />
            </div>

            <button className="save-button" onClick={handleAtualizarDados}>
              Salvar Dados
            </button>
          </div>

          <div className="bloco-dados">
            <h1 className="main-title">Segurança</h1>

            <div className="input-group input-security-top">
              <label className="label-input">Nova Senha</label>
              <input
                type="password"
                className="input-form-data"
                placeholder="******"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="label-input">Confirmar Nova Senha</label>
              <input
                type="password"
                className="input-form-data"
                placeholder="******"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
              />
            </div>

            {erroSenha && (
              <p className="feedback-mensagem erro-mensagem">
                <AlertCircle size={18} /> {erroSenha}
              </p>
            )}

            <button className="save-button" onClick={handleRedefinirSenha}>
              Redefinir Senha
            </button>

            {sucesso && (
              <p className="feedback-mensagem sucesso-mensagem">
                <CheckCircle size={20} /> {sucesso}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
