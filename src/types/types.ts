/**
 * `src/types/types.ts`
 *
 * Propósito geral:
 * - Centralizar tipos compartilhados entre componentes, contextos e integrações com API.
 * - Evitar duplicação de contratos (ex.: usuário autenticado, respostas de login).
 */

/**
 * Representa o usuário autenticado no front-end.
 *
 * Observação:
 * - `roles` é opcional porque pode depender da resposta do backend (`/auth/me`).
 */
export interface User {
  email: string;
  name: string;
  roles?: string[]; // ex.: ["ADMIN", "PROFESSOR"]
}

/** Resposta de login bem-sucedido. */
export interface LoginSuccess {
  success: true;
}

/** Resposta de login com erro (mensagem amigável para UI). */
export interface LoginError {
  success: false;
  message: string;
}

/** União discriminada para facilitar o tratamento de sucesso/erro no UI. */
export type LoginResponse = LoginSuccess | LoginError;

/**
 * Assinatura da função de login.
 *
 * Entrada:
 * - `email`: credencial do usuário
 * - `password`: senha
 *
 * Saída:
 * - `Promise<LoginResponse>`
 */
export type LoginFunction = (
  email: string,
  password: string
) => Promise<LoginResponse>;

/**
 * Assinatura da função de logout.
 *
 * Observação:
 * - Neste projeto, a implementação pode realizar efeitos colaterais (ex.: chamar API e limpar storage).
 */
export type LogoutFunction = () => void;

/**
 * Contrato do `AuthContext` exposto para a árvore React.
 *
 * Campos derivados:
 * - `isAdmin`/`isProfessor` e `hasRole` são conveniências para o UI (ex.: controle de acesso).
 */
export interface AuthContextType {
  user: User | null;
  login: LoginFunction;
  logout: LogoutFunction;
  loading: boolean;
  isAdmin?: boolean;
  isProfessor?: boolean;
  hasRole?: (role: string) => boolean;
}

/**
 * Props do componente de Header.
 *
 * Observação:
 * - Mantém campos opcionais para permitir que o Header seja usado em telas sem autenticação.
 */
export interface HeaderProps {
  user?: User | null;
  logout?: LogoutFunction;
  loading?: boolean;
}
