"use client";

/**
 * `src/components/cadastroprofessor/page.tsx` (CadastroProfessor)
 *
 * Propósito geral:
 * - Formulário controlado para cadastro/edição de Professor.
 *
 * Observação:
 * - Este componente aparenta ser um formulário “genérico”; a persistência efetiva
 *   é responsabilidade do container via `onSubmit`.
 */
import { FormEvent, useState } from "react";
import styles from "./CadastroProfessor.module.css";

export interface CadastroProfessorValues {
  nome: string;
  email: string;
  senha: string;
  documento: string; // CPF ou CNPJ
  escola: string;
  turma: string;
}

export interface CadastroProfessorProps {
  initialValues?: Partial<CadastroProfessorValues>;
  onSubmit?: (values: CadastroProfessorValues) => void;
  className?: string;
}

export default function CadastroProfessor({
  initialValues,
  onSubmit,
  className,
}: CadastroProfessorProps) {
  const isEdit = initialValues != null;
  /** Estado controlado do formulário. */
  const [values, setValues] = useState<CadastroProfessorValues>({
    nome: initialValues?.nome ?? "",
    email: initialValues?.email ?? "",
    senha: initialValues?.senha ?? "",
    documento: initialValues?.documento ?? "",
    escola: initialValues?.escola ?? "",
    turma: initialValues?.turma ?? "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { id, value } = e.target;
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (onSubmit) onSubmit(values);
    // Sem `onSubmit`, o formulário não persiste (comportamento atual).
  }

  return (
    <div className={styles.pageContainer + (className ? ` ${className}` : "")}>
      <form className={styles.cadastroForm} onSubmit={handleSubmit}>
        <h1 className={styles.title}>
          {isEdit ? "Atualizar dados do professor" : "Cadastrar professor"}
        </h1>

        <div className={styles.formColumns}>
          <div className={styles.column}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="nome">
                Nome do(a) Professor(a)
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
                E-mail principal do
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
          {isEdit ? "Atualizar" : "Cadastrar"}
        </button>
      </form>
    </div>
  );
}
