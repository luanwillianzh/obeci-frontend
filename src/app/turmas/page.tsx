"use client";
import Title from "@/components/title/title";
import ClassCard from "@/components/class_card/class_card"; 
import ButtonObeci from "@/components/button/button";
import "./turmas.css";

export default function Turma() {
  return (
    <>
    <div style={{padding: '2.5rem'}}>
      <div style={{display: 'grid', gridTemplateColumns: '5fr 2fr', justifyContent: 'center', gap: '2rem'}}>
        <div>
          <Title text="Turmas"></Title>
          <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'space-evenly', gap: '5rem, 5rem', marginBottom: '1rem'}}>
            <ClassCard class_name="Turma A" turno="Manhã" q_alunos={30} class_id="1"></ClassCard>
            <ClassCard class_name="Turma A" turno="Manhã" q_alunos={30} class_id="1"></ClassCard>
            <ClassCard class_name="Turma A" turno="Manhã" q_alunos={30} class_id="1"></ClassCard>
            <ClassCard class_name="Turma A" turno="Manhã" q_alunos={30} class_id="1"></ClassCard>
            <ClassCard class_name="Turma A" turno="Manhã" q_alunos={30} class_id="1"></ClassCard>
            <ClassCard class_name="Turma A" turno="Manhã" q_alunos={30} class_id="1"></ClassCard>
            <ClassCard class_name="Turma A" turno="Manhã" q_alunos={30} class_id="1"></ClassCard>
            <ClassCard class_name="Turma A" turno="Manhã" q_alunos={30} class_id="1"></ClassCard>
            <ClassCard class_name="Turma A" turno="Manhã" q_alunos={30} class_id="1"></ClassCard>
            <ClassCard class_name="Turma A" turno="Manhã" q_alunos={30} class_id="1"></ClassCard>
            <ClassCard class_name="Turma A" turno="Manhã" q_alunos={30} class_id="1"></ClassCard>
            <ClassCard class_name="Turma A" turno="Manhã" q_alunos={30} class_id="1"></ClassCard>
            <ClassCard class_name="Turma A" turno="Manhã" q_alunos={30} class_id="1"></ClassCard>
            <ClassCard class_name="Turma A" turno="Manhã" q_alunos={30} class_id="1"></ClassCard>
            <ClassCard class_name="Turma A" turno="Manhã" q_alunos={30} class_id="1"></ClassCard>
            <ClassCard class_name="Turma A" turno="Manhã" q_alunos={30} class_id="1"></ClassCard>
            <ClassCard class_name="Turma A" turno="Manhã" q_alunos={30} class_id="1"></ClassCard>
            <ClassCard class_name="Turma A" turno="Manhã" q_alunos={30} class_id="1"></ClassCard>
          </div>
        </div>
        <div className="lembrete">
        </div>
      </div>
    </div>
    </>
  );
}
