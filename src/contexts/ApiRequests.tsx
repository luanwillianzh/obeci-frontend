"use client";

export type JsonBody =
  | Record<string, unknown>
  | Array<unknown>
  | string
  | FormData;

function getBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base)
    throw new Error(
      "Configuração ausente: defina NEXT_PUBLIC_API_URL em .env.local"
    );
  return base.replace(/\/$/, "");
}

function buildInit(
  method: string,
  body?: JsonBody,
  init?: RequestInit
): RequestInit {
  const headers: HeadersInit = {
    ...(init?.headers || {}),
  };
  const final: RequestInit = {
    ...init,
    method,
    credentials: "include",
    headers,
  };
  if (body !== undefined) {
    // If sending FormData, let the browser set the multipart boundary and don't stringify
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      final.body = body as FormData;
      // Ensure Content-Type is not forcibly set so boundary is included automatically
      if ((headers as Record<string, string>)["Content-Type"]) {
        delete (headers as Record<string, string>)["Content-Type"];
      }
    } else {
      (headers as Record<string, string>)["Content-Type"] =
        (headers as Record<string, string>)["Content-Type"] ||
        "application/json";
      final.body =
        typeof body === "string" ? (body as string) : JSON.stringify(body);
    }
  }
  return final;
}

async function doFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, { credentials: "include", ...init });
}

export const Api = {
  get(path: string, init?: RequestInit) {
    return doFetch(path, buildInit("GET", undefined, init));
  },
  post(path: string, body?: JsonBody, init?: RequestInit) {
    return doFetch(path, buildInit("POST", body, init));
  },
  put(path: string, body?: JsonBody, init?: RequestInit) {
    return doFetch(path, buildInit("PUT", body, init));
  },
  del(path: string, init?: RequestInit) {
    return doFetch(path, buildInit("DELETE", undefined, init));
  },
};

// Convenience typed helpers (optional usage)
export type UsuarioPayload = {
  username: string;
  email: string;
  password?: string;
  cpf: string;
  arrayRoles: string[];
};

export type UsuarioUpdatePayload = {
  username: string;
  email: string;
  arrayRoles: string[];
  cpf?: string;
  password?: string;
};

export type EscolaPayload = { nome: string; cidade: string; isActive: boolean };

export type TurmaPayload = {
  nome: string;
  escolaId: number;
  professorId: number;
  turno: string;
  isActive: boolean;
};

export type ProfessorResponse = { id: number; username: string; email: string };

export type UsuarioSelfUpdatePayload = {
  username?: string;
  email?: string;
  password?: string;
  cpf?: string;
};

export const Requests = {
  // Auth
  login(email: string, password: string) {
    return Api.post("/auth/login", { email, password });
  },
  me() {
    return (async () => {
      const res = await Api.get("/auth/me");
      if (res.status >= 400 && res.status < 500) {
        try {
          await Api.post("/auth/logout");
        } catch {}
        try {
          // Limpa possível cache local de usuário
          localStorage.removeItem("user");
          localStorage.setItem("sessionExpired", "1");
        } catch {}
      }
      return res;
    })();
  },
  updateMe(payload: UsuarioSelfUpdatePayload) {
    return Api.put("/auth/me", payload);
  },
  logout() {
    return Api.post("/auth/logout");
  },

  // Usuarios
  listUsuarios() {
    return Api.get("/api/usuarios");
  },
  createUsuario(payload: UsuarioPayload) {
    return Api.post("/api/usuarios", payload);
  },
  updateUsuario(id: number, payload: UsuarioUpdatePayload) {
    return Api.put(`/api/usuarios/${id}`, payload);
  },
  deleteUsuario(id: number) {
    return Api.del(`/api/usuarios/${id}`);
  },
  searchProfessores(q?: string) {
    const qs = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    return Api.get(`/api/usuarios/role/PROFESSOR${qs}`);
  },
  listProfessores() {
    return Api.get("/api/usuarios/professores");
  },
  // Administradores
  listAdmins() {
    return Api.get("/api/usuarios/role/ADMIN");
  },

  // Escolas
  listEscolas() {
    return Api.get("/api/escolas");
  },
  createEscola(payload: EscolaPayload) {
    return Api.post("/api/escolas", payload);
  },
  updateEscola(id: number, payload: EscolaPayload) {
    return Api.put(`/api/escolas/${id}`, payload);
  },
  deleteEscola(id: number) {
    return Api.del(`/api/escolas/${id}`);
  },

  // Turmas
  listTurmas() {
    return Api.get("/api/turmas");
  },
  listMyTurmas() {
    return Api.get("/api/turmas/mine");
  },
  createTurma(payload: TurmaPayload) {
    return Api.post("/api/turmas", payload);
  },
  updateTurma(id: number, payload: TurmaPayload) {
    return Api.put(`/api/turmas/${id}`, payload);
  },
  deleteTurma(id: number) {
    return Api.del(`/api/turmas/${id}`);
  },

  // Instrumentos (slides por turma)
  getInstrumentoByTurma(turmaId: number) {
    return Api.get(`/api/instrumentos/turma/${turmaId}`);
  },
  createInstrumento(turmaId: number, slides: unknown) {
    // Cria ou substitui os slides para a turma via POST
    return Api.post(`/api/instrumentos/turma/${turmaId}`, slides as JsonBody);
  },
  saveInstrumento(turmaId: number, slides: unknown) {
    // Backend espera o JSON dos slides diretamente no body (array/obj)
    return Api.put(`/api/instrumentos/turma/${turmaId}`, slides as JsonBody);
  },
  updateInstrumento(turmaId: number, slides: unknown) {
    // Alias explícito para atualização via PUT
    return Api.put(`/api/instrumentos/turma/${turmaId}`, slides as JsonBody);
  },
  uploadInstrumentoImage(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    return Api.post(`/api/instrumentos/images`, fd);
  },
  getInstrumentoImage(id: number) {
    // Retorna a resposta; consumir via res.blob() para obter a imagem
    return Api.get(`/api/instrumentos/images/${id}`);
  },
  getInstrumentoImageUrl(id: number) {
    // Helper para usar em <img src=...> com URL absoluta
    return `${getBaseUrl()}/api/instrumentos/images/${id}`;
  },
};
