"use client";
import { useEffect, useMemo, useState } from "react";
import ClassCard from "@/components/class_card/class_card";
import "./turmas.css";
import { Requests } from "@/contexts/ApiRequests";
import { useAuth } from "@/contexts/useAuth";

type Turma = {
  id: number;
  nome: string;
  turno: string;
  escolaId: number;
  professorId: number;
  isActive: boolean;
};

type Escola = { id: number; nome: string };

export default function TurmasPage() {
  const { isAdmin } = useAuth();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [loading, setLoading] = useState(true);
  const [lembretes, setLembretes] = useState<string[]>([]);
  const [novoLembrete, setNovoLembrete] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [turmasRes, escolasRes] = await Promise.all([
          isAdmin ? Requests.listTurmas() : Requests.listMyTurmas(),
          Requests.listEscolas(),
        ]);
        if (!turmasRes.ok || !escolasRes.ok) {
          // Em erro de carregamento (ex.: 401/403/404), apenas recarregar a página
          try {
            window.location.reload();
          } catch {}
          return;
        }
        const t = (await turmasRes.json()) as Turma[];
        const e = (await escolasRes.json()) as Escola[];
        setTurmas(t || []);
        setEscolas(e || []);
      } catch (err: any) {
        try {
          window.location.reload();
        } catch {}
        return;
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin]);

  const escolasById = useMemo(
    () => new Map(escolas.map((e) => [e.id, e])),
    [escolas]
  );
  const turmasPorEscola = useMemo(() => {
    const map = new Map<number, Turma[]>();
    for (const t of turmas) {
      const arr = map.get(t.escolaId) || [];
      arr.push(t);
      map.set(t.escolaId, arr);
    }
    return map;
  }, [turmas]);

  const adicionarLembrete = () => {
    const txt = novoLembrete.trim();
    if (txt) {
      setLembretes((prev) => [...prev, txt]);
      setNovoLembrete("");
    }
  };

  const removerLembrete = (index: number) => {
    setLembretes((prev) => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="container-principal-turmas">
        <p>Carregando turmas...</p>
      </div>
    );
  }

  // Em caso de erro, a página será recarregada pelo efeito acima.

  if (!turmas.length) {
    return (
      <div className="container-principal-turmas">
        <div className="container-lembrete-turmas">
          <div className="container-header-turmas">
            <div className="container-texto"></div>
            <div className="container-turmas">
              <div className="empty-message">
                {isAdmin
                  ? "Nenhuma turma cadastrada ainda."
                  : "Você ainda não possui turmas atribuídas."}
              </div>
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
    );
  }

  return (
    <div className="container-principal-turmas">
      <div className="container-lembrete-turmas">
        <div className="container-header-turmas">
          <div className="container-texto"></div>
          <div className="container-turmas">
            {Array.from(turmasPorEscola.entries()).map(([escolaId, lista]) => (
              <div key={escolaId} className="grupo-escola">
                <div className="separator-escola">
                  <h4>
                    {escolasById.get(escolaId)?.nome || `Escola #${escolaId}`}
                  </h4>
                  <div className="linha-ofuscada"></div>
                </div>
                <div className="turmas-grid">
                  {lista.map((t) => (
                    <ClassCard
                      key={t.id}
                      class_name={t.nome}
                      turno={t.turno}
                      q_alunos={0}
                      class_id={String(t.id)}
                    />
                  ))}
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
  );
}
