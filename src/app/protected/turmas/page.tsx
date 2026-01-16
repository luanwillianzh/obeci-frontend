"use client";

/**
 * `src/app/protected/turmas/page.tsx`
 *
 * Propósito geral:
 * - Tela principal de turmas do usuário.
 * - Para ADMIN: lista todas as turmas e professores.
 * - Para não-ADMIN: lista apenas as turmas atribuídas ao usuário.
 * - Inclui um bloco de “Lembretes” do próprio usuário autenticado.
 *
 * Pontos críticos de lógica:
 * - Carregamento via `Promise.all` para reduzir latência.
 * - Em falhas (ex.: 401/403), o comportamento atual é recarregar a página.
 * - IDs são resolvidos em nomes via `useMemo` (Map) para lookup O(1).
 */
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
  const { isAdmin, user } = useAuth();

  /** Listas base carregadas do backend. */
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [professores, setProfessores] = useState<
    { id: number; username: string; email: string }[]
  >([]);

  /** Estados de carregamento e UI do painel de lembretes. */
  const [loading, setLoading] = useState(true);
  const [lembretes, setLembretes] = useState<string[]>([]);
  const [novoLembrete, setNovoLembrete] = useState("");
  const [editandoIndex, setEditandoIndex] = useState<number | null>(null);
  const [lembreteSaving, setLembreteSaving] = useState(false);

  /**
   * Carrega dados iniciais da tela.
   * - Turmas variam por role.
   * - Professores só são carregados para ADMIN.
   * - Lembretes sempre são do usuário atual.
   */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [turmasRes, escolasRes, professoresRes, lembretesRes] = await Promise.all([
          isAdmin ? Requests.listTurmas() : Requests.listMyTurmas(),
          Requests.listEscolas(),
          // Somente ADMIN tem permissão para listar professores.
          isAdmin ? Requests.listProfessores() : Promise.resolve(null as any),
          // Lembretes são sempre do próprio usuário (autenticado)
          Requests.listMyLembretes(),
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

        if (lembretesRes && lembretesRes.ok) {
          const l = (await lembretesRes.json()) as string[];
          setLembretes(l || []);
        } else {
          setLembretes([]);
        }

        if (isAdmin && professoresRes && professoresRes.ok) {
          const p = (await professoresRes.json()) as {
            id: number;
            username: string;
            email: string;
          }[];
          setProfessores(p || []);
        } else {
          setProfessores([]);
        }
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

  /** Cache de nomes de professores para renderização de cards. */
  const professorNomeById = useMemo(
    () => new Map(professores.map((p) => [p.id, p.username])),
    [professores]
  );

  /** Cache de escolas por ID para renderização dos grupos. */
  const escolasById = useMemo(
    () => new Map(escolas.map((e) => [e.id, e])),
    [escolas]
  );

  /**
   * Agrupa turmas por escola para renderizar em seções.
   * Saída:
   * - `Map<escolaId, Turma[]>`
   */
  const turmasPorEscola = useMemo(() => {
    const map = new Map<number, Turma[]>();
    for (const t of turmas) {
      const arr = map.get(t.escolaId) || [];
      arr.push(t);
      map.set(t.escolaId, arr);
    }
    return map;
  }, [turmas]);

  /**
   * Salva novo lembrete ou atualiza lembrete existente.
   *
   * Regras:
   * - Se `editandoIndex` é `null`, cria; senão, atualiza o índice.
   * - Em erro, mantém o comportamento atual de recarregar a página.
   */
  const adicionarOuEditarLembrete = async () => {
    const txt = novoLembrete;
    if (!txt.trim()) return;
    setLembreteSaving(true);
    try {
      const res =
        editandoIndex === null
          ? await Requests.addMyLembrete(txt)
          : await Requests.updateMyLembrete(editandoIndex, txt);

      if (!res.ok) {
        // Mantém o comportamento atual de “recuperar” por reload em caso de erro
        try {
          window.location.reload();
        } catch {}
        return;
      }
      const updated = (await res.json()) as string[];
      setLembretes(updated || []);
      setNovoLembrete("");
      setEditandoIndex(null);
    } finally {
      setLembreteSaving(false);
    }
  };

  /** Inicia edição carregando o texto no textarea. */
  const iniciarEdicao = (index: number) => {
    setEditandoIndex(index);
    setNovoLembrete(lembretes[index] ?? "");
  };

  /** Cancela edição e limpa o editor. */
  const cancelarEdicao = () => {
    setEditandoIndex(null);
    setNovoLembrete("");
  };

  /** Remove lembrete por índice e atualiza a lista com retorno do backend. */
  const removerLembrete = async (index: number) => {
    setLembreteSaving(true);
    try {
      const res = await Requests.deleteMyLembrete(index);
      if (!res.ok) {
        try {
          window.location.reload();
        } catch {}
        return;
      }
      const updated = (await res.json()) as string[];
      setLembretes(updated || []);

      // Se deletou o item que estava sendo editado, cancela edição.
      if (editandoIndex === index) {
        cancelarEdicao();
      }
    } finally {
      setLembreteSaving(false);
    }
  };

  if (loading) {
    return null;
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
                  <div className="acoes-lembrete">
                    <button
                      onClick={() => iniciarEdicao(index)}
                      className="botao-editar"
                      title="Editar lembrete"
                      disabled={lembreteSaving}
                    >
                      editar
                    </button>
                    <button
                      onClick={() => removerLembrete(index)}
                      className="botao-excluir"
                      title="Excluir lembrete"
                      disabled={lembreteSaving}
                    >
                      x
                    </button>
                  </div>
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
              <div className="lembrete-botoes">
                <button
                  onClick={adicionarOuEditarLembrete}
                  className="botao-salvar"
                  disabled={lembreteSaving}
                >
                  {editandoIndex === null ? "Salvar" : "Atualizar"}
                </button>
                {editandoIndex !== null && (
                  <button
                    onClick={cancelarEdicao}
                    className="botao-cancelar"
                    disabled={lembreteSaving}
                  >
                    Cancelar
                  </button>
                )}
              </div>
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
                      class_name={`Turma #${t.id} - ${t.nome}`}
                      turno={t.turno}
                      professor_nome={
                        isAdmin
                          ? professorNomeById.get(t.professorId) ||
                            `#${t.professorId}`
                          : user?.name || `#${t.professorId}`
                      }
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
                <div className="acoes-lembrete">
                  <button
                    onClick={() => iniciarEdicao(index)}
                    className="botao-editar"
                    title="Editar lembrete"
                    disabled={lembreteSaving}
                  >
                    editar
                  </button>
                  <button
                    onClick={() => removerLembrete(index)}
                    className="botao-excluir"
                    title="Excluir lembrete"
                    disabled={lembreteSaving}
                  >
                    x
                  </button>
                </div>
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
            <div className="lembrete-botoes">
              <button
                onClick={adicionarOuEditarLembrete}
                className="botao-salvar"
                disabled={lembreteSaving}
              >
                {editandoIndex === null ? "Salvar" : "Atualizar"}
              </button>
              {editandoIndex !== null && (
                <button
                  onClick={cancelarEdicao}
                  className="botao-cancelar"
                  disabled={lembreteSaving}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
