"use client";

/**
 * `src/components/cadastrousuarios/page.tsx` (CadastroUsuarios)
 *
 * Propósito geral:
 * - Formulário reutilizável para criação/edição de usuários (PROFESSOR e ADMIN).
 * - O prop `tipo` altera apenas textos (título/labels), mantendo o mesmo shape de submit.
 *
 * Observação:
 * - O componente não faz validação de regras de negócio; essa responsabilidade
 *   normalmente fica no container/página que chama `onSubmit` e no backend.
 */

import { FormEvent, useState } from "react";
import styles from "../cadastroprofessor/CadastroProfessor.module.css";

// CadastroUsuarios
// Formulário reutilizado para PROFESSOR e ADMIN.
// O "tipo" controla apenas textos (título/labels), mantendo o mesmo shape de submit.

export type CadastroUsuarioTipo = "professor" | "administrador";

export interface CadastroUsuariosValues {
  nome: string;
  email: string;
  senha: string;
  documento: string; // CPF ou CNPJ
  escola?: string;
  turma?: string;
}

export interface CadastroUsuariosProps {
  // Ajusta apenas textos do formulário (título/labels).
  tipo: CadastroUsuarioTipo;
  initialValues?: Partial<CadastroUsuariosValues>;
  onSubmit?: (values: CadastroUsuariosValues) => void;
  className?: string;
}

/**
 * Formulário controlado.
 *
 * Entrada:
 * - `tipo`: define copy do UI (professor | administrador)
 * - `initialValues`: pré-preenche campos (uso típico em edição)
 * - `onSubmit`: callback para enviar valores ao container
 */
export default function CadastroUsuarios({
  tipo,
  initialValues,
  onSubmit,
  className,
}: CadastroUsuariosProps) {
  /** Estado do formulário (campos controlados). */
  const [values, setValues] = useState<CadastroUsuariosValues>({
    nome: initialValues?.nome ?? "",
    email: initialValues?.email ?? "",
    senha: initialValues?.senha ?? "",
    documento: initialValues?.documento ?? "",
    escola: initialValues?.escola ?? "",
    turma: initialValues?.turma ?? "",
  });

  const isProfessor = tipo === "professor";
  // Textos dinâmicos para evitar exibir "Professor" quando for admin.
  const title = isProfessor ? "Cadastro Professor" : "Cadastro Administrador";
  const nomeLabel = isProfessor
    ? "Nome do(a) Professor(a)"
    : "Nome do(a) Administrador(a)";

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { id, value } = e.target;
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Encaminha os valores para o componente pai (create/update + role no payload).
    if (onSubmit) onSubmit(values);
  }

  return (
    <div className={styles.pageContainer + (className ? ` ${className}` : "")}> 
      <form className={styles.cadastroForm} onSubmit={handleSubmit}>
        <h1 className={styles.title}>{title}</h1>

        <div className={styles.formColumns}>
          <div className={styles.column}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="nome">
                {nomeLabel}
              </label>
              <input
                type="text"
                id="nome"
                className={styles.rect}
                value={values.nome}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="email">
                E-mail principal
              </label>
              <input
                type="text"
                id="email"
                className={styles.rect}
                value={values.email}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="senha">
                Senha
              </label>
              <input
                type="password"
                id="senha"
                className={styles.rect}
                value={values.senha}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="documento">
                CPF ou CNPJ
              </label>
              <input
                id="documento"
                className={`${styles.rect} ${styles.rectTextarea}`}
                value={values.documento}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <button type="submit" className={styles.btnCadastrar}>
          Cadastrar
        </button>
      </form>
    </div>
  );
}
