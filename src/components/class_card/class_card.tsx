"use client";
import Link from "next/link";
import "./class_card.css";
export default function ClassCard({
  class_name,
  turno,
  q_alunos,
  class_id,
}: {
  class_name: string;
  turno: string;
  q_alunos: number;
  class_id: string;
}) {
  return (
    <div className="class-card">
      <h2>{class_name}</h2>
      <p className="turno">Turno: {turno}</p>
      <p className="q_alunos">Alunos: {q_alunos}</p>
      <Link
        className="ancora"
        href={`/protected/instrumento?t=${encodeURIComponent(class_id)}`}
      >
        Processo Documental
      </Link>
    </div>
  );
}
