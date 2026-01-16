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
  return (
    <div className="class-card">
      <h2>{class_name}</h2>
      <p className="turno">Turno: {turno}</p>
      {professor_nome ? (
        <p className="turno">Professor: {professor_nome}</p>
      ) : null}
      <Link
        className="ancora"
        // Codifica o ID para garantir compatibilidade com caracteres especiais.
        href={`/protected/instrumento?t=${encodeURIComponent(class_id)}`}
      >
        Processo Documental
      </Link>
    </div>
  );
}
