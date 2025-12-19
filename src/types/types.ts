export interface User {
  email: string;
  name: string;
  roles?: string[]; // ex.: ["ADMIN", "PROFESSOR"]
}

export interface LoginSuccess {
  success: true;
}

export interface LoginError {
  success: false;
  message: string;
}

export type LoginResponse = LoginSuccess | LoginError;

export type LoginFunction = (
  email: string,
  password: string
) => Promise<LoginResponse>;

export type LogoutFunction = () => void;

export interface AuthContextType {
  user: User | null;
  login: LoginFunction;
  logout: LogoutFunction;
  loading: boolean;
  isAdmin?: boolean;
  isProfessor?: boolean;
  hasRole?: (role: string) => boolean;
}

export interface HeaderProps {
  user?: User | null;
  logout?: LogoutFunction;
  loading?: boolean;
}
