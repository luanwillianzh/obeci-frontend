"use client";

/**
 * `src/components/class_card/class_card.tsx`
 *
 * Propósito geral:
 * - Cartão de apresentação de uma Turma.
 * - Encapsula link para o módulo de instrumento (Processo Documental), passando
 *   o ID da turma via querystring.
 */
import Link from "next/link";
import "./class_card.css";

/**
 * Props do cartão.
 *
 * Observação:
 * - `q_alunos` existe como contrato de UI, mas o componente atualmente não exibe esse valor.
 */
export default function ClassCard({
  class_name,
  turno,
  professor_nome,
  q_alunos,
  class_id,
}: {
  class_name: string;
  turno: string;
  professor_nome?: string;
  q_alunos: number;
  class_id: string;
}) {
  void q_alunos;
  return (
    <div className="class-card">
      <div className="class-card__left">
        <div className="class-card__avatar" aria-hidden="true">
          📓
        </div>
        <div className="class-card__text">
          <div className="class-card__title">{class_name}</div>
          <div className="class-card__meta">
            <span>Turno: {turno}</span>
            {professor_nome ? (
              <>
                <span className="class-card__sep">|</span>
                <span>Professor: {professor_nome}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <Link
        className="class-card__action"
        // Codifica o ID para garantir compatibilidade com caracteres especiais.
        href={`/protected/instrumento?t=${encodeURIComponent(class_id)}`}
      >
        Processo Documental
      </Link>
    </div>
  );
}
