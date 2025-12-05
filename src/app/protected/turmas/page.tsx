"use client";
import { useState } from "react";
import ClassCard from "@/components/class_card/class_card";
import "./turmas.css";
import ProtectedLayout from "../layout";

export default function Turma() {
  const [lembretes, setLembretes] = useState<string[]>([]);
  const [novoLembrete, setNovoLembrete] = useState("");

  const adicionarLembrete = () => {
    if (novoLembrete.trim()) {
      setLembretes([...lembretes, novoLembrete]);
      setNovoLembrete("");
    }
  };

  const removerLembrete = (index: number) => {
    const novosLembretes = lembretes.filter((_, i) => i !== index);
    setLembretes(novosLembretes);
  };

  return (
    <>
      <div className="container-principal-turmas">
        <div className="container-lembrete-turmas">
          <div className="container-header-turmas">
            <div className="container-texto">
            </div>
            <div className="container-turmas">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="grupo-escola">
                  <div className="separator-escola">
                    <h4>Escola Municipal tal</h4>
                    <div className="linha-ofuscada"></div>
                  </div>
                  <div className="turmas-grid">
                    <ClassCard class_name="Turma A" class_id="1" />
                    <ClassCard class_name="Turma A" class_id="1" />
                    <ClassCard class_name="Turma A" class_id="1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lembrete">
            <h2>Lembretes</h2>
            <div className="lista-lembretes">
              {lembretes.map((lembrete, index) => (
                <div key={index} className="item-lembrete">
                  <p>{lembrete}</p>
                  <button
                    onClick={() => removerLembrete(index)}
                    className="botao-excluir"
                    title="Excluir lembrete"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
            <div className="novo-lembrete-container">
              <textarea
                className="lembrete-textarea"
                placeholder="Digite seu lembrete..."
                value={novoLembrete}
                onChange={(e) => setNovoLembrete(e.target.value)}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              <button onClick={adicionarLembrete} className="botao-salvar">
                Salvar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
