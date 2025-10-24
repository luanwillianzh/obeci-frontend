"use client";
import Title from "@/components/title/title";
import ClassCard from "@/components/class_card/class_card"; 
import ButtonObeci from "@/components/button/button";
import "./turmas.css";

export default function Turma() {
  return (
    <>
    <Title text="Turmas"></Title>
    <ClassCard class_name="Turma A" turno="Manhã" q_alunos={30} class_id="1"></ClassCard>
    <ButtonObeci text="Adicionar Turma"></ButtonObeci>
    </>
  );
}
