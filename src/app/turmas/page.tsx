"use client";
import ClassCard from "@/components/class_card/class_card";
import "./turmas.css";

export default function Turma() {
  return (
    <>
      <div className="container-principal-turmas">
        <div className="container-lembrete-turmas">
          <div className="container-header-turmas">
            <div className="container-texto">
              <h1>turmas</h1>
            </div>
            <div className="container-turmas">
              <ClassCard
                class_name="Turma A"
                turno="Manhã"
                q_alunos={30}
                class_id="1"
              ></ClassCard>
              <ClassCard
                class_name="Turma A"
                turno="Manhã"
                q_alunos={30}
                class_id="1"
              ></ClassCard>
              <ClassCard
                class_name="Turma A"
                turno="Manhã"
                q_alunos={30}
                class_id="1"
              ></ClassCard>
              <ClassCard
                class_name="Turma A"
                turno="Manhã"
                q_alunos={30}
                class_id="1"
              ></ClassCard>
              <ClassCard
                class_name="Turma A"
                turno="Manhã"
                q_alunos={30}
                class_id="1"
              ></ClassCard>
              <ClassCard
                class_name="Turma A"
                turno="Manhã"
                q_alunos={30}
                class_id="1"
              ></ClassCard>
              <ClassCard
                class_name="Turma A"
                turno="Manhã"
                q_alunos={30}
                class_id="1"
              ></ClassCard>
              <ClassCard
                class_name="Turma A"
                turno="Manhã"
                q_alunos={30}
                class_id="1"
              ></ClassCard>
              <ClassCard
                class_name="Turma A"
                turno="Manhã"
                q_alunos={30}
                class_id="1"
              ></ClassCard>
              <ClassCard
                class_name="Turma A"
                turno="Manhã"
                q_alunos={30}
                class_id="1"
              ></ClassCard>
              <ClassCard
                class_name="Turma A"
                turno="Manhã"
                q_alunos={30}
                class_id="1"
              ></ClassCard>
              <ClassCard
                class_name="Turma A"
                turno="Manhã"
                q_alunos={30}
                class_id="1"
              ></ClassCard>
              <ClassCard
                class_name="Turma A"
                turno="Manhã"
                q_alunos={30}
                class_id="1"
              ></ClassCard>
              <ClassCard
                class_name="Turma A"
                turno="Manhã"
                q_alunos={30}
                class_id="1"
              ></ClassCard>
              <ClassCard
                class_name="Turma A"
                turno="Manhã"
                q_alunos={30}
                class_id="1"
              ></ClassCard>
              <ClassCard
                class_name="Turma A"
                turno="Manhã"
                q_alunos={30}
                class_id="1"
              ></ClassCard>
              <ClassCard
                class_name="Turma A"
                turno="Manhã"
                q_alunos={30}
                class_id="1"
              ></ClassCard>
              <ClassCard
                class_name="Turma A"
                turno="Manhã"
                q_alunos={30}
                class_id="1"
              ></ClassCard>
            </div>
          </div>
          <div className="lembrete">
            <h2>Lembretes</h2>
            <textarea
              className="lembrete-textarea"
              placeholder="Digite seus lembretes..."
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            <textarea
              className="lembrete-textarea"
              placeholder="Digite seus lembretes..."
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
