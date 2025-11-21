export interface User {
  email: string;
  name: string;
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
}

export interface HeaderProps {
  user?: User | null;
  logout?: LogoutFunction;
  loading?: boolean;
}
