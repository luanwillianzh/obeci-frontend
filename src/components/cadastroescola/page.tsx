"use client";

/**
 * `src/components/cadastroescola/page.tsx` (CadastroEscola)
 *
 * Propósito geral:
 * - Formulário controlado para criação/edição de Escola.
 *
 * Observação:
 * - Não chama API diretamente; delega a persistência ao `onSubmit`.
 */
import { FormEvent, useState } from "react";
import styles from "./CadastroEscola.module.css";

export interface CadastroEscolaValues {
  nome: string;
  cidade: string;
}

export interface CadastroEscolaProps {
  initialValues?: Partial<CadastroEscolaValues>;
  onSubmit?: (values: CadastroEscolaValues) => void;
  className?: string;
}

export default function CadastroEscola({
  initialValues,
  onSubmit,
  className,
}: CadastroEscolaProps) {
  const isEdit = initialValues != null;
  /** Estado controlado do formulário (permite pré-preencher via `initialValues`). */
  const [values, setValues] = useState<CadastroEscolaValues>({
    nome: initialValues?.nome ?? "",
    cidade: initialValues?.cidade ?? "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value } = e.target;
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (onSubmit) onSubmit(values);
    else console.log("CadastroEscola submit:", values);
  }

  return (
    <div className={styles.pageContainer + (className ? ` ${className}` : "")}>
      <form className={styles.cadastroForm} onSubmit={handleSubmit}>
        <h1 className={styles.title}>
          {isEdit ? "Atualizar dados da escola" : "Cadastrar escola"}
        </h1>
        <div className={styles.formColumns}>
          <div className={styles.column}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="nome">
                Nome da Escola
              </label>
              <input
                id="nome"
                className={styles.rect}
                value={values.nome}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className={styles.column}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="cidade">
                Cidade
              </label>
              <input
                id="cidade"
                className={styles.rect}
                value={values.cidade}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <button type="submit" className={styles.btnCadastrar}>
            {isEdit ? "Atualizar" : "Cadastrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
