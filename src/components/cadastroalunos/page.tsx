"use client";

/**
 * `src/components/cadastroalunos/page.tsx` (CadastroTurma)
 *
 * Propósito geral:
 * - Formulário reutilizável para criar/editar Turmas.
 * - Carrega opções de `Escola` e `Professor` a partir do backend.
 *
 * Pontos críticos:
 * - Mantém `values` como estado local controlado.
 * - Realiza validações mínimas no submit (campos obrigatórios e IDs > 0).
 */
import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./CadastroAlunos.module.css";
import { Requests, ProfessorResponse } from "@/contexts/ApiRequests";

export interface CadastroTurmaValues {
  nome: string;
  turno: string;
  escolaId: number;
  professorIds: number[];
  isActive: boolean;
}

export interface CadastroTurmaProps {
  initialValues?: Partial<CadastroTurmaValues>;
  onSubmit?: (values: CadastroTurmaValues) => void;
  className?: string;
}

export default function CadastroTurma({
  initialValues,
  onSubmit,
  className,
}: CadastroTurmaProps) {
  const isEdit = initialValues != null;
  /**
   * Estado controlado do formulário.
   * - `initialValues` permite reutilização para edição.
   */
  const [values, setValues] = useState<CadastroTurmaValues>({
    nome: initialValues?.nome ?? "",
    turno: initialValues?.turno ?? "",
    escolaId: initialValues?.escolaId ?? 0,
    professorIds: initialValues?.professorIds ?? [],
    isActive: initialValues?.isActive ?? true,
  });

  const [professorToAddId, setProfessorToAddId] = useState(0);

  type EscolaOption = { id: number; nome: string };
  const [escolas, setEscolas] = useState<EscolaOption[]>([]);
  const [professores, setProfessores] = useState<ProfessorResponse[]>([]);

  const professorById = useMemo(() => {
    return new Map(professores.map((p) => [p.id, p] as const));
  }, [professores]);

  /**
   * Carrega escolas.
   * - `alive` evita setState após unmount.
   */
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await Requests.listEscolas();
        if (!res.ok) return;
        const data = (await res.json()) as EscolaOption[];
        if (alive) setEscolas(data || []);
      } catch {}
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Carrega professores.
   * Observação:
   * - Este endpoint pode exigir role ADMIN no backend.
   */
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await Requests.listProfessores();
        if (!res.ok) return;
        const data = (await res.json()) as ProfessorResponse[];
        if (alive) setProfessores(data || []);
      } catch {}
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  /** Handler genérico para inputs textuais (usa o `id` como chave em `values`). */
  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value } = e.target;
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value } = e.target;
    const parsed = parseInt(value, 10);
    setValues((prev) => ({ ...prev, [id]: isNaN(parsed) ? 0 : parsed }));
  }

  function handleCheckboxChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, checked } = e.target;
    setValues((prev) => ({ ...prev, [id]: checked }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Validação mínima de campos obrigatórios.
    if (!values.nome.trim() || !values.turno.trim()) return;
    if (!values.escolaId || values.escolaId <= 0) return;
    if (!values.professorIds || values.professorIds.length <= 0) return;
    if (onSubmit) onSubmit(values);
    else console.log("CadastroTurma submit:", values);
  }

  function addProfessorId(id: number) {
    if (!Number.isFinite(id) || id <= 0) return;
    setValues((prev) => {
      if (prev.professorIds.includes(id)) return prev;
      return { ...prev, professorIds: [...prev.professorIds, id] };
    });
  }

  function removeProfessorId(id: number) {
    setValues((prev) => ({
      ...prev,
      professorIds: prev.professorIds.filter((pid) => pid !== id),
    }));
  }

  return (
    <div className={styles.pageContainer + (className ? ` ${className}` : "")}>
      <form className={styles.cadastroForm} onSubmit={handleSubmit}>
        <h1 className={styles.title}>
          {isEdit ? "Atualizar dados da turma" : "Cadastrar turma"}
        </h1>

        <div className={styles.formColumns}>
          <div className={styles.column}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="nome">
                Nome da Turma
              </label>
              <input
                type="text"
                id="nome"
                className={styles.rect}
                value={values.nome}
                onChange={handleTextChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="turno">
                Turno
              </label>
              <input
                type="text"
                id="turno"
                className={styles.rect}
                value={values.turno}
                onChange={handleTextChange}
              />
            </div>
          </div>

          <div className={styles.column}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="escolaId">
                Escola
              </label>
              <select
                id="escolaId"
                className={styles.rect}
                value={values.escolaId}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    escolaId: parseInt(e.target.value, 10),
                  }))
                }
              >
                <option value={0}>Selecione uma escola</option>
                {escolas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="professorIds">
                Professores
              </label>
              <select
                id="professorIds"
                className={styles.rect}
                value={professorToAddId}
                onChange={(e) => {
                  const id = parseInt(e.target.value, 10);
                  if (Number.isFinite(id) && id > 0) {
                    addProfessorId(id);
                  }
                  setProfessorToAddId(0);
                }}
              >
                <option value={0}>Selecione um professor para adicionar</option>
                {professores.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={values.professorIds.includes(p.id)}
                  >
                    {p.username} ({p.email})
                    {values.professorIds.includes(p.id) ? " — adicionado" : ""}
                  </option>
                ))}
              </select>

              {values.professorIds.length > 0 ? (
                <div className={styles.chipList} aria-label="Professores selecionados">
                  {values.professorIds.map((id) => {
                    const p = professorById.get(id);
                    const label = p
                      ? `${p.username} (${p.email})`
                      : `Professor #${id}`;
                    return (
                      <span key={id} className={styles.chip} title={label}>
                        {label}
                        <button
                          type="button"
                          className={styles.chipRemove}
                          aria-label={`Remover ${label}`}
                          onClick={() => removeProfessorId(id)}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.helperText}>
                  Selecione pelo menos 1 professor.
                </div>
              )}
            </div>

           {/*  <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="isActive">
                Ativa
              </label>
              <input
                type="checkbox"
                id="isActive"
                checked={values.isActive}
                onChange={handleCheckboxChange}
              />
            </div> */}
          </div>
        </div>

        <button type="submit" className={styles.btnCadastrar}>
          {isEdit ? "Atualizar" : "Cadastrar"}
        </button>
      </form>
    </div>
  );
}
