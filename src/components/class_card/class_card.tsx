"use client";
import Link from "next/link";
import "./class_card.css";
export default function ClassCard({
  class_name,
  class_id,
}: {
  class_name: string;
  class_id: string;
}) {
  return (
    <div className="class-card">
      <h2>{class_name}</h2>
      <p className="professora">Professora: Fulana de tal</p>
      <p className="info-menor">Número de alunos: 30</p>
      <p className="info-menor">Turno: Manhã</p>
      <Link className="ancora" href="/protected/publication">
        Ver turma
      </Link>
    </div>
  );
}
