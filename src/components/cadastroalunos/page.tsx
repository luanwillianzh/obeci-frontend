"use client";
import { FormEvent, useEffect, useState } from "react";
import styles from "./CadastroAlunos.module.css";
import { Requests, ProfessorResponse } from "@/contexts/ApiRequests";

export interface CadastroTurmaValues {
  nome: string;
  turno: string;
  escolaId: number;
  professorId: number;
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
  const [values, setValues] = useState<CadastroTurmaValues>({
    nome: initialValues?.nome ?? "",
    turno: initialValues?.turno ?? "",
    escolaId: initialValues?.escolaId ?? 0,
    professorId: initialValues?.professorId ?? 0,
    isActive: initialValues?.isActive ?? true,
  });

  type EscolaOption = { id: number; nome: string };
  const [escolas, setEscolas] = useState<EscolaOption[]>([]);
  const [professores, setProfessores] = useState<ProfessorResponse[]>([]);

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
    if (!values.nome.trim() || !values.turno.trim()) return;
    if (!values.escolaId || values.escolaId <= 0) return;
    if (!values.professorId || values.professorId <= 0) return;
    if (onSubmit) onSubmit(values);
    else console.log("CadastroTurma submit:", values);
  }

  return (
    <div className={styles.pageContainer + (className ? ` ${className}` : "")}>
      <form className={styles.cadastroForm} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Cadastro Turma</h1>

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
              <label className={styles.label} htmlFor="professorId">
                Professor
              </label>
              <select
                id="professorId"
                className={styles.rect}
                value={values.professorId}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    professorId: parseInt(e.target.value, 10),
                  }))
                }
              >
                <option value={0}>Selecione um professor</option>
                {professores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.username} ({p.email})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="isActive">
                Ativa
              </label>
              <input
                type="checkbox"
                id="isActive"
                checked={values.isActive}
                onChange={handleCheckboxChange}
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
