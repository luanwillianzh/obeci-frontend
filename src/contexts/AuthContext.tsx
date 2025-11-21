import { AuthContextType } from "@/types/types";
import { createContext } from "react";

export const AuthContext = createContext<AuthContextType | null>(null);
