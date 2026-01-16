# Documentação do Front-End (src)

Data: 2026-01-15

## Objetivo
Este documento descreve, de forma técnica e objetiva, os arquivos principais dentro de `front-end-obeci/src/`, com foco em:
- Propósito de cada arquivo
- Funções/componentes/exportações principais
- Entradas/saídas (props, parâmetros e retornos)
- Efeitos colaterais relevantes
- Dependências importantes
- Pontos não claros/assunções (quando aplicável)

> Observação: esta documentação foi escrita a partir do código atual. Se alguma regra de negócio estiver implícita no backend, ela é tratada aqui como “dependência externa”.

---

## Visão geral de arquitetura

- **Framework**: Next.js (App Router) com React.
- **Autenticação**: gerenciada por `AuthProvider` via `AuthContext`.
  - Requests são feitos com `credentials: "include"`, sugerindo sessão via cookie HttpOnly no backend.
  - O front também persiste um “snapshot” de usuário (`user`) em `localStorage` para UI.
- **Integração com API**: centralizada em `src/contexts/ApiRequests.tsx`.
  - Depende de `NEXT_PUBLIC_API_URL`.
- **UI**: componentes simples e CSS/CSS Modules.

---

## `src/types/types.ts`

**Propósito**: concentrar contratos de tipagem compartilhados.

**Principais exports**
- `User`
  - **Campos**: `email`, `name`, `roles?`
  - **Uso**: estado do usuário autenticado no front-end.
- `LoginResponse` (`LoginSuccess | LoginError`)
  - **Uso**: padroniza retorno de `login` para o UI.
- `AuthContextType`
  - **Campos**: `user`, `login`, `logout`, `loading`, `isAdmin?`, `isProfessor?`, `hasRole?`
  - **Uso**: contrato do contexto consumido por `useAuth()`.

**Efeitos colaterais**: nenhum (somente tipos).

**Dependências**: nenhuma.

---

## `src/contexts/AuthContext.tsx`

**Propósito**: criar o contexto React de autenticação.

**Principais exports**
- `AuthContext: React.Context<AuthContextType | null>`

**Efeitos colaterais**: nenhum.

**Dependências**
- React (`createContext`)
- Tipos em `src/types/types.ts`

---

## `src/contexts/useAuth.ts`

**Propósito**: hook para consumir o `AuthContext` com garantia de uso correto.

**Principais exports**
- `useAuth(): AuthContextType`
  - **Entrada**: nenhuma
  - **Saída**: objeto `AuthContextType`
  - **Exceções**: lança `Error` se usado fora de `<AuthProvider>`

**Efeitos colaterais**: nenhum.

**Dependências**
- React (`useContext`)
- `AuthContext`

---

## `src/contexts/ApiRequests.tsx`

**Propósito**: centralizar construção e execução de requests HTTP.

**Principais exports**
- `Api`
  - `get(path, init?)`
  - `post(path, body?, init?)`
  - `put(path, body?, init?)`
  - `del(path, init?)`
  - **Saída**: `Promise<Response>`
  - **Efeito colateral**: faz `fetch` com `credentials: "include"`.
- `Requests` (camada de endpoints)
  - **Auth**: `login`, `me`, `updateMe`, `logout`
  - **Lembretes**: `listMyLembretes`, `addMyLembrete`, `updateMyLembrete`, `deleteMyLembrete`
  - **Usuários**: `listUsuarios`, `createUsuario`, `updateUsuario`, `deleteUsuario`, `listProfessores`, `listAdmins`, etc.
  - **Escolas**: `listEscolas`, `createEscola`, `updateEscola`, `deleteEscola`
  - **Turmas**: `listTurmas`, `listMyTurmas`, `createTurma`, `updateTurma`, `deleteTurma`
  - **Instrumentos**: `getInstrumentoByTurma`, `createInstrumento`, `saveInstrumento`, `uploadInstrumentoImage`, `getInstrumentoImageUrl`, etc.

**Funções internas relevantes**
- `getBaseUrl()`
  - **Entrada**: nenhuma
  - **Saída**: string normalizada (sem `/` no fim)
  - **Exceção**: lança erro se `NEXT_PUBLIC_API_URL` não definido
- `buildInit(method, body?, init?)`
  - **Responsabilidade**: montar `RequestInit` consistente
  - **Regra**: se `FormData`, não força `Content-Type`
- `doFetch(path, init?)`
  - **Responsabilidade**: montar URL final e chamar `fetch`

**Efeitos colaterais importantes**
- `Requests.me()`:
  - Em status 4xx, tenta `POST /auth/logout`.
  - Escreve `sessionExpired=1` e remove `user` no `localStorage`.

**Dependências**
- `process.env.NEXT_PUBLIC_API_URL`
- Web APIs: `fetch`, `FormData`, `localStorage`

**Pontos não claros**
- A estratégia de “logout automático em 4xx no `/auth/me`” é uma decisão do front. Ela assume que qualquer 4xx equivale a sessão inválida (isso pode ou não ser verdade dependendo do backend).

---

## `src/contexts/AuthProvider.tsx`

**Propósito**: provider do contexto de autenticação.

**Principais exports**
- `default export function AuthProvider({ children })`

**Funções internas relevantes**
- `login(email, password): Promise<LoginResponse>`
  - **Fluxo**:
    1. Verifica `NEXT_PUBLIC_API_URL`.
    2. Tenta `Requests.logout()` preventivo.
    3. Faz `Requests.login(email,password)`.
    4. Se ok, chama `Requests.me()` para obter `username/email/roles`.
    5. Persiste `user` no `localStorage` e atualiza state.
  - **Efeitos colaterais**: requests HTTP + escrita em `localStorage`.
- `logout(): Promise<void>`
  - **Efeitos colaterais**: `Requests.logout()` + limpeza de `localStorage`.
- `useEffect(init)`
  - **Responsabilidade**: hidratar sessão via `Requests.me()` no mount.

**Dependências**
- `Requests` (API)
- Web API `localStorage`

**Pontos não claros**
- O código importa `Api` mas não utiliza no arquivo (pode ser resquício).

---

## `src/app/layout.tsx`

**Propósito**: layout raiz do App Router.

**Principais exports**
- `metadata`
- `RootLayout({ children })`
  - Envolve o app com `<AuthProvider>`.

**Dependências**
- Next `Metadata`
- Fonts do Next (`next/font/google`)

---

## `src/app/page.tsx`

**Propósito**: rota `/` como redirecionamento.

**Principal export**
- `Home()`
  - **Efeito colateral**: `redirect("/login")`.

---

## `src/app/not-found.tsx`

**Propósito**: handler de 404 com redirecionamento condicional.

**Principal export**
- `NotFound()`
  - **Efeito colateral**: `router.replace(...)` após término do `loading`.

---

## `src/app/login/page.tsx`

**Propósito**: tela de login.

**Principais funções/handlers**
- `handleLogin()`
  - **Entrada**: nenhuma (usa state `email/password`)
  - **Saída**: `Promise<void>`
  - **Efeito colateral**: chama `login(email,password)`; navega para `/protected/turmas`.
- `useEffect(logout on mount)`
  - **Efeito colateral**: chama `logout()` para limpar sessão.
- `useEffect(sessionExpired)`
  - **Efeito colateral**: lê `localStorage.sessionExpired`.

**Dependências**
- `useAuth()`
- `next/navigation` (`useRouter`)

---

## `src/app/protected/layout.tsx`

**Propósito**: layout/guard de rotas protegidas.

**Comportamento**
- Se `!loading && !user`: `router.replace("/login")`.
- Enquanto `loading || !user`: exibe tela de carregamento.

---

## `src/app/protected/turmas/page.tsx`

**Propósito**: listar turmas e gerenciar lembretes.

**Principais handlers**
- `useEffect(load)`
  - Carrega turmas/escolas/lembretes e professores (somente ADMIN).
  - Em erro, comportamento atual é `window.location.reload()`.
- `adicionarOuEditarLembrete()`
  - Cria ou atualiza lembrete via API e atualiza state com retorno.
- `removerLembrete(index)`
  - Remove via API e atualiza state.

**Dependências**
- `Requests`
- `useAuth()`

**Pontos não claros**
- `q_alunos` é sempre passado como `0` no `ClassCard` (não há integração para contagem de alunos no código atual).

---

## `src/app/protected/administrador/layout.tsx`

**Propósito**: guard por role (ADMIN).

**Regra**
- Não logado: `redirect("/login")`
- Logado sem ADMIN: `redirect("/protected/turmas")`

---

## `src/app/protected/administrador/page.tsx`

**Propósito**: console administrativo (CRUD).

**Componentes internos principais**
- `Card` / `ProfileCard`: UI de listagem com ações.
- `EscolasView`, `ProfessoresView`, `AdministradoresView`, `TurmasView`
  - Filtro client-side por `searchQuery`.

**Funções principais**
- `loadEscolas`, `loadProfessores`, `loadAdministradores`, `loadTurmas`
  - **Saída**: `Promise<void>`
  - **Efeito colateral**: chamadas HTTP e atualização de state.
- `handleSubmitEscola`, `handleSubmitProfessor`, `handleSubmitAdmin`, `handleSubmitTurma`
  - **Entrada**: valores de formulário (`CadastroEscolaValues`, `CadastroUsuariosValues`, `CadastroTurmaValues`)
  - **Efeito colateral**: create/update via API, fecha modal e recarrega lista.
- `handleDeleteEscola/Professor/Administrador/Turma`
  - **Efeito colateral**: `confirm()` + delete via API.

**Dependências**
- `Requests`
- `Modal` e formulários de cadastro (`CadastroEscola`, `CadastroUsuarios`, `CadastroTurma`).

---

## `src/app/protected/user/page.tsx`

**Propósito**: perfil do usuário autenticado (dados + segurança).

**Principais handlers**
- `handleFileUpload()`
  - **Efeito colateral**: lê arquivo local e cria DataURL para preview.
- `handleRedefinirSenha()`
  - **Efeito colateral**: validação front + `Requests.updateMe({ password })`.
- `handleAtualizarDados()`
  - **Efeito colateral**: `Requests.updateMe({ username, email })`.

**Pontos não claros**
- A foto de perfil não é persistida no backend (apenas preview local no estado).

---

## `src/app/protected/instrumento/page.tsx`

**Propósito**: editor de slides por turma.

**Principal export**
- `PublicacoesPage()`
  - **Entrada**: query param `t` (turmaId)
  - **Efeitos colaterais**:
    - Leitura/escrita em `localStorage` quando não há `turmaId`
    - Calls em `Requests.getInstrumentoByTurma/saveInstrumento/createInstrumento` quando há `turmaId`

**Funções internas relevantes**
- `getInitialSlides()`
  - Define o estado inicial (localStorage vs. default).

**Pontos não claros**
- Existe `StorageService` descrito como futuro; no fluxo atual, a persistência via API e localStorage ocorre em outros trechos do arquivo.

---

## Componentes

### `src/components/ui/Modal.tsx`
- **Propósito**: modal reutilizável.
- **Entradas**: `isOpen`, `onClose`, `children`, `title?`.
- **Efeitos colaterais**: listener de `keydown` para fechar com `Escape`.

### `src/components/header/header.tsx`
- **Propósito**: header global.
- **Dependências**: `usePathname`, `useAuth`.

### `src/components/class_card/class_card.tsx`
- **Propósito**: card de turma.
- **Efeito colateral**: navegação via `Link` para `/protected/instrumento?t=...`.

### Formulários
- `src/components/cadastroalunos/page.tsx` (CadastroTurma)
  - Carrega escolas e professores via API.
- `src/components/cadastrousuarios/page.tsx` (CadastroUsuarios)
  - Reutilizado para criar/editar PROFESSOR e ADMIN (copy do UI varia por `tipo`).
- `src/components/cadastroescola/page.tsx` (CadastroEscola)
- `src/components/cadastroprofessor/page.tsx` (CadastroProfessor)

---

## Estilos (CSS)

Os arquivos CSS/CSS Modules em `src/` são responsáveis pelo visual das telas e componentes:
- `src/app/globals.css` (tokens e base global)
- `src/app/login/loginpage.css`
- `src/app/protected/*/*.css`
- `src/components/*/*.css` e `*.module.css`

**Ponto de atenção**
- Alguns arquivos usam nesting com `&` (sintaxe típica de pré-processadores/PostCSS). Isso depende da configuração do build do projeto.
