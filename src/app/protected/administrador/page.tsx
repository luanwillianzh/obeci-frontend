"use client";

import { useEffect, useMemo, useState } from "react";
import { PenTool, User, Search, Trash2 } from "lucide-react";
import "./administrar_dados.css";
import Modal from "../../../components/ui/Modal";
import CadastroProfessor, {
  CadastroProfessorValues,
} from "../../../components/cadastroprofessor/page";
import CadastroTurma, {
  CadastroTurmaValues,
} from "../../../components/cadastroalunos/page";
import { Requests } from "@/contexts/ApiRequests";
import CadastroEscola, {
  CadastroEscolaValues,
} from "../../../components/cadastroescola/page";

const Card = ({
  nome,
  subtitle,
  onEdit,
  onDelete,
}: {
  nome: string;
  subtitle?: string;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <div className="admin-card">
    <p className="card-text">
      Nome: <strong>{nome}</strong>
    </p>
    {subtitle ? <p className="card-text">{subtitle}</p> : null}
    <div className="card-actions">
      <PenTool
        size={20}
        className="card-edit-icon"
        onClick={onEdit}
        role="button"
      />
      <Trash2
        size={20}
        className="card-delete-icon"
        onClick={onDelete}
        role="button"
      />
    </div>
  </div>
);

const ProfileCard = ({
  nome,
  onEdit,
  onDelete,
}: {
  nome: string;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <div className="profile-card">
    <div className="profile-info-group">
      <User size={40} color="#6d6d6d" className="profile-icon" />
      <span className="profile-name">{nome}</span>
    </div>
    <div className="card-actions">
      <PenTool
        size={25}
        className="card-edit-icon"
        onClick={onEdit}
        role="button"
      />
      <Trash2
        size={25}
        className="card-delete-icon"
        onClick={onDelete}
        role="button"
      />
    </div>
    <hr className="profile-card-separator" />
  </div>
);

type Escola = { id: number; nome: string; cidade: string; isActive: boolean };
type Professor = { id: number; username: string; email: string };
type Administrador = { id: number; username: string; email: string };
type Turma = {
  id: number;
  nome: string;
  turno: string;
  escolaId: number;
  professorId: number;
  isActive: boolean;
};

const EscolasView = ({
  onNew,
  items,
  onEdit,
  onDelete,
}: {
  onNew: () => void;
  items: Escola[];
  onEdit: (item: Escola) => void;
  onDelete: (item: Escola) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((e) => e.nome.toLowerCase().includes(q));
  }, [items, searchQuery]);

  return (
    <>
      <div className="admin-header-content">
        <h1 className="content-title">Administrar Escolas</h1>
        <button className="new-button" onClick={onNew}>
          Nova Escola
        </button>
      </div>

      <div className="search-input-container">
        <Search size={25} className="search-icon" />
        <input
          type="text"
          placeholder="Pesquisar escola..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="card-grid">
        {filtered.map((escola) => (
          <Card
            key={escola.id}
            nome={escola.nome}
            subtitle={escola.isActive ? "Ativa" : "Inativa"}
            onEdit={() => onEdit(escola)}
            onDelete={() => onDelete(escola)}
          />
        ))}
      </div>
    </>
  );
};

const ProfessoresView = ({
  onNew,
  items,
  onEdit,
  onDelete,
}: {
  onNew: () => void;
  items: Professor[];
  onEdit: (item: Professor) => void;
  onDelete: (item: Professor) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.username.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  return (
    <>
      <div className="admin-header-content">
        <h1 className="content-title">Administrar Professores</h1>
        <button className="new-button" onClick={onNew}>
          Novo Professor
        </button>
      </div>

      <div className="search-input-container">
        <Search size={25} className="search-icon" />
        <input
          type="text"
          placeholder="Pesquisar professor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="profile-list-container">
        {filtered.map((prof) => (
          <ProfileCard
            key={prof.id}
            nome={`${prof.username} (${prof.email})`}
            onEdit={() => onEdit(prof)}
            onDelete={() => onDelete(prof)}
          />
        ))}
      </div>
    </>
  );
};

const TurmasView = ({
  onNew,
  items,
  onEdit,
  onDelete,
}: {
  onNew: () => void;
  items: Turma[];
  onEdit: (item: Turma) => void;
  onDelete: (item: Turma) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((t) => t.nome.toLowerCase().includes(q));
  }, [items, searchQuery]);

  return (
    <>
      <div className="admin-header-content">
        <h1 className="content-title">Administrar Turmas</h1>
        <button className="new-button" onClick={onNew}>
          Nova Turma
        </button>
      </div>

      <div className="search-input-container">
        <Search size={25} className="search-icon" />
        <input
          type="text"
          placeholder="Pesquisar turma..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="profile-list-container">
        {filtered.map((turma) => (
          <ProfileCard
            key={turma.id}
            nome={`${turma.nome} - ${turma.turno}`}
            onEdit={() => onEdit(turma)}
            onDelete={() => onDelete(turma)}
          />
        ))}
      </div>
    </>
  );
};

const AdministradoresView = ({
  onNew,
  items,
  onEdit,
  onDelete,
}: {
  onNew: () => void;
  items: Administrador[];
  onEdit: (item: Administrador) => void;
  onDelete: (item: Administrador) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (a) =>
        a.username.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  return (
    <>
      <div className="admin-header-content">
        <h1 className="content-title">Administrar Administradores</h1>
        <button className="new-button" onClick={onNew}>
          Novo Administrador
        </button>
      </div>

      <div className="search-input-container">
        <Search size={25} className="search-icon" />
        <input
          type="text"
          placeholder="Pesquisar administrador..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="profile-list-container">
        {filtered.map((adm) => (
          <ProfileCard
            key={adm.id}
            nome={`${adm.username} (${adm.email})`}
            onEdit={() => onEdit(adm)}
            onDelete={() => onDelete(adm)}
          />
        ))}
      </div>
    </>
  );
};

type ActiveTab = "escolas" | "professores" | "administradores" | "turmas";

export default function AdministrarDados() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("escolas");
  const [isEscolaOpen, setEscolaOpen] = useState(false);
  const [isProfessorOpen, setProfessorOpen] = useState(false);
  const [isAdminOpen, setAdminOpen] = useState(false);
  const [isTurmaOpen, setTurmaOpen] = useState(false);

  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [administradores, setAdministradores] = useState<Administrador[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);

  const [editEscolaId, setEditEscolaId] = useState<number | null>(null);
  const [editProfessorId, setEditProfessorId] = useState<number | null>(null);
  const [editAdminId, setEditAdminId] = useState<number | null>(null);
  const [editTurmaId, setEditTurmaId] = useState<number | null>(null);

  const escolaById = useMemo(
    () => new Map(escolas.map((e) => [e.id, e])),
    [escolas]
  );
  const turmaById = useMemo(
    () => new Map(turmas.map((t) => [t.id, t])),
    [turmas]
  );

  async function loadEscolas() {
    try {
      const res = await Requests.listEscolas();
      if (res.ok) {
        const data = (await res.json()) as Escola[];
        setEscolas(data || []);
      }
    } catch {}
  }

  async function loadProfessores() {
    try {
      const res = await Requests.listProfessores();
      if (res.ok) {
        const data = (await res.json()) as Professor[];
        setProfessores(data || []);
      }
    } catch {}
  }

  async function loadAdministradores() {
    try {
      const res = await Requests.listAdmins();
      if (res.ok) {
        const data = (await res.json()) as Administrador[];
        setAdministradores(data || []);
      }
    } catch {}
  }

  async function loadTurmas() {
    try {
      const res = await Requests.listTurmas();
      if (res.ok) {
        const data = (await res.json()) as Turma[];
        setTurmas(data || []);
      }
    } catch {}
  }

  useEffect(() => {
    loadEscolas();
    loadProfessores();
    loadAdministradores();
    loadTurmas();
  }, []);

  async function handleSubmitEscola(values: CadastroEscolaValues) {
    try {
      if (editEscolaId) {
        const current = escolaById.get(editEscolaId);
        const res = await Requests.updateEscola(editEscolaId, {
          nome: values.nome,
          cidade: values.cidade,
          isActive: current ? current.isActive : true,
        });
        if (!res.ok) {
          const msg = await res.text();
          alert(msg || "Falha ao atualizar escola");
          return;
        }
      } else {
        const res = await Requests.createEscola({
          nome: values.nome,
          cidade: values.cidade,
          isActive: true,
        });
        if (!res.ok) {
          const msg = await res.text();
          alert(msg || "Falha ao criar escola");
          return;
        }
      }
      setEscolaOpen(false);
      setEditEscolaId(null);
      loadEscolas();
    } catch (e) {
      alert("Erro ao conectar com o servidor");
    }
  }

  async function handleSubmitProfessor(values: CadastroProfessorValues) {
    try {
      if (editProfessorId) {
        const payload: any = {
          username: values.nome,
          email: values.email,
          arrayRoles: ["PROFESSOR"],
        };
        const cpf = values.documento?.trim();
        if (cpf) payload.cpf = cpf;
        const senha = values.senha?.trim();
        if (senha) payload.password = senha;
        const res = await Requests.updateUsuario(editProfessorId, payload);
        if (!res.ok) {
          let errorMsg = "Falha ao atualizar professor";
          try {
            const data = await res.json();
            if (data?.errors && Array.isArray(data.errors)) {
              errorMsg = data.errors.map((e: any) => e.message).join("\n");
            } else if (typeof data?.error === "string") {
              errorMsg = data.error;
            }
          } catch {
            try {
              const txt = await res.text();
              if (txt) errorMsg = txt;
            } catch {}
          }
          alert(errorMsg);
          return;
        }
      } else {
        const res = await Requests.createUsuario({
          username: values.nome,
          email: values.email,
          password: values.senha,
          cpf: values.documento,
          arrayRoles: ["PROFESSOR"],
        });
        if (!res.ok) {
          let errorMsg = "Falha ao criar professor";
          try {
            const data = await res.json();
            if (data?.errors && Array.isArray(data.errors)) {
              errorMsg = data.errors.map((e: any) => e.message).join("\n");
            } else if (typeof data?.error === "string") {
              errorMsg = data.error;
            }
          } catch {
            try {
              const txt = await res.text();
              if (txt) errorMsg = txt;
            } catch {}
          }
          alert(errorMsg);
          return;
        }
      }
      setProfessorOpen(false);
      setEditProfessorId(null);
      loadProfessores();
    } catch (e) {
      alert("Erro ao conectar com o servidor");
    }
  }

  async function handleSubmitAdmin(values: CadastroProfessorValues) {
    try {
      if (editAdminId) {
        const payload: any = {
          username: values.nome,
          email: values.email,
          arrayRoles: ["ADMIN"],
        };
        const cpf = values.documento?.trim();
        if (cpf) payload.cpf = cpf;
        const senha = values.senha?.trim();
        if (senha) payload.password = senha;
        const res = await Requests.updateUsuario(editAdminId, payload);
        if (!res.ok) {
          let errorMsg = "Falha ao atualizar administrador";
          try {
            const data = await res.json();
            if (data?.errors && Array.isArray(data.errors)) {
              errorMsg = data.errors.map((e: any) => e.message).join("\n");
            } else if (typeof data?.error === "string") {
              errorMsg = data.error;
            }
          } catch {
            try {
              const txt = await res.text();
              if (txt) errorMsg = txt;
            } catch {}
          }
          alert(errorMsg);
          return;
        }
      } else {
        const res = await Requests.createUsuario({
          username: values.nome,
          email: values.email,
          password: values.senha,
          cpf: values.documento,
          arrayRoles: ["ADMIN"],
        });
        if (!res.ok) {
          let errorMsg = "Falha ao criar administrador";
          try {
            const data = await res.json();
            if (data?.errors && Array.isArray(data.errors)) {
              errorMsg = data.errors.map((e: any) => e.message).join("\n");
            } else if (typeof data?.error === "string") {
              errorMsg = data.error;
            }
          } catch {
            try {
              const txt = await res.text();
              if (txt) errorMsg = txt;
            } catch {}
          }
          alert(errorMsg);
          return;
        }
      }
      setAdminOpen(false);
      setEditAdminId(null);
      loadAdministradores();
    } catch (e) {
      alert("Erro ao conectar com o servidor");
    }
  }

  async function handleSubmitTurma(values: CadastroTurmaValues) {
    try {
      if (editTurmaId) {
        const res = await Requests.updateTurma(editTurmaId, {
          nome: values.nome,
          turno: values.turno,
          escolaId: values.escolaId,
          professorId: values.professorId,
          isActive: values.isActive,
        });
        if (!res.ok) {
          const msg = await res.text();
          alert(msg || "Falha ao atualizar turma");
          return;
        }
      } else {
        const res = await Requests.createTurma({
          nome: values.nome,
          turno: values.turno,
          escolaId: values.escolaId,
          professorId: values.professorId,
          isActive: values.isActive,
        });
        if (!res.ok) {
          const msg = await res.text();
          alert(msg || "Falha ao criar turma");
          return;
        }
      }
      setTurmaOpen(false);
      setEditTurmaId(null);
      loadTurmas();
    } catch (e) {
      alert("Erro ao conectar com o servidor");
    }
  }

  async function handleDeleteEscola(item: Escola) {
    if (!confirm(`Excluir escola "${item.nome}"?`)) return;
    try {
      const res = await Requests.deleteEscola(item.id);
      if (!res.ok) {
        const msg = await res.text();
        alert(msg || "Falha ao excluir escola");
        return;
      }
      loadEscolas();
    } catch {
      alert("Erro ao conectar com o servidor");
    }
  }

  async function handleDeleteProfessor(item: Professor) {
    if (!confirm(`Excluir professor "${item.username}"?`)) return;
    try {
      const res = await Requests.deleteUsuario(item.id);
      if (!res.ok) {
        const msg = await res.text();
        alert(msg || "Falha ao excluir professor");
        return;
      }
      loadProfessores();
    } catch {
      alert("Erro ao conectar com o servidor");
    }
  }

  async function handleDeleteAdministrador(item: Administrador) {
    if (!confirm(`Excluir administrador "${item.username}"?`)) return;
    try {
      const res = await Requests.deleteUsuario(item.id);
      if (!res.ok) {
        const msg = await res.text();
        alert(msg || "Falha ao excluir administrador");
        return;
      }
      loadAdministradores();
    } catch {
      alert("Erro ao conectar com o servidor");
    }
  }

  async function handleDeleteTurma(item: Turma) {
    if (!confirm(`Excluir turma "${item.nome}"?`)) return;
    try {
      const res = await Requests.deleteTurma(item.id);
      if (!res.ok) {
        const msg = await res.text();
        alert(msg || "Falha ao excluir turma");
        return;
      }
      loadTurmas();
    } catch {
      alert("Erro ao conectar com o servidor");
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case "escolas":
        return (
          <EscolasView
            onNew={() => {
              setEditEscolaId(null);
              setEscolaOpen(true);
            }}
            items={escolas}
            onEdit={(e) => {
              setEditEscolaId(e.id);
              setEscolaOpen(true);
            }}
            onDelete={handleDeleteEscola}
          />
        );
      case "professores":
        return (
          <ProfessoresView
            onNew={() => {
              setEditProfessorId(null);
              setProfessorOpen(true);
            }}
            items={professores}
            onEdit={(p) => {
              setEditProfessorId(p.id);
              setProfessorOpen(true);
            }}
            onDelete={handleDeleteProfessor}
          />
        );
      case "administradores":
        return (
          <AdministradoresView
            onNew={() => {
              setEditAdminId(null);
              setAdminOpen(true);
            }}
            items={administradores}
            onEdit={(a) => {
              setEditAdminId(a.id);
              setAdminOpen(true);
            }}
            onDelete={handleDeleteAdministrador}
          />
        );
      case "turmas":
        return (
          <TurmasView
            onNew={() => {
              setEditTurmaId(null);
              setTurmaOpen(true);
            }}
            items={turmas}
            onEdit={(t) => {
              setEditTurmaId(t.id);
              setTurmaOpen(true);
            }}
            onDelete={handleDeleteTurma}
          />
        );
      default:
        return (
          <EscolasView
            onNew={() => {
              setEditEscolaId(null);
              setEscolaOpen(true);
            }}
            items={escolas}
            onEdit={(e) => {
              setEditEscolaId(e.id);
              setEscolaOpen(true);
            }}
            onDelete={handleDeleteEscola}
          />
        );
    }
  };

  return (
    <>
      <div className="admin-page-container">
        <aside className="sidebar-admin">
          <button
            onClick={() => setActiveTab("escolas")}
            className={`admin-tab-button ${
              activeTab === "escolas" ? "active-tab" : ""
            }`}
          >
            Escolas
          </button>
          <button
            onClick={() => setActiveTab("professores")}
            className={`admin-tab-button ${
              activeTab === "professores" ? "active-tab" : ""
            }`}
          >
            Professores
          </button>
          <button
            onClick={() => setActiveTab("administradores")}
            className={`admin-tab-button ${
              activeTab === "administradores" ? "active-tab" : ""
            }`}
          >
            Admins
          </button>
          <button
            onClick={() => setActiveTab("turmas")}
            className={`admin-tab-button ${
              activeTab === "turmas" ? "active-tab" : ""
            }`}
          >
            Turmas
          </button>

          <div className="sidebar-separator" />
        </aside>

        <main className="content-admin">
          {renderContent()}
          <Modal
            isOpen={isEscolaOpen}
            onClose={() => {
              setEscolaOpen(false);
              setEditEscolaId(null);
            }}
            title="Nova Escola"
          >
            <CadastroEscola
              onSubmit={handleSubmitEscola}
              initialValues={
                editEscolaId
                  ? {
                      nome: escolaById.get(editEscolaId)?.nome,
                      cidade: escolaById.get(editEscolaId)?.cidade,
                    }
                  : undefined
              }
            />
          </Modal>
          <Modal
            isOpen={isProfessorOpen}
            onClose={() => {
              setProfessorOpen(false);
              setEditProfessorId(null);
            }}
            title="Novo Professor"
          >
            <CadastroProfessor
              onSubmit={handleSubmitProfessor}
              initialValues={
                editProfessorId
                  ? {
                      nome:
                        professores.find((p) => p.id === editProfessorId)
                          ?.username || "",
                      email:
                        professores.find((p) => p.id === editProfessorId)
                          ?.email || "",
                    }
                  : undefined
              }
            />
          </Modal>
          <Modal
            isOpen={isAdminOpen}
            onClose={() => {
              setAdminOpen(false);
              setEditAdminId(null);
            }}
            title="Novo Administrador"
          >
            <CadastroProfessor
              onSubmit={handleSubmitAdmin}
              initialValues={
                editAdminId
                  ? {
                      nome:
                        administradores.find((a) => a.id === editAdminId)
                          ?.username || "",
                      email:
                        administradores.find((a) => a.id === editAdminId)
                          ?.email || "",
                    }
                  : undefined
              }
            />
          </Modal>
          <Modal
            isOpen={isTurmaOpen}
            onClose={() => {
              setTurmaOpen(false);
              setEditTurmaId(null);
            }}
            title="Nova Turma"
          >
            <CadastroTurma
              onSubmit={handleSubmitTurma}
              initialValues={
                editTurmaId
                  ? {
                      nome: turmaById.get(editTurmaId)?.nome,
                      turno: turmaById.get(editTurmaId)?.turno,
                      escolaId: turmaById.get(editTurmaId)?.escolaId,
                      professorId: turmaById.get(editTurmaId)?.professorId,
                      isActive: turmaById.get(editTurmaId)?.isActive,
                    }
                  : undefined
              }
            />
          </Modal>
        </main>
      </div>
    </>
  );
}
