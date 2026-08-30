"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { PublicUser } from "@el-tesoro/shared";
import { fetchCurrentUser, loginAccount, logoutAccount, registerAccount } from "@/services/accountApi";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

interface UserContextValue {
  user: PublicUser | null;
  status: SessionStatus;
  login: (input: { email: string; password: string }) => Promise<PublicUser>;
  register: (input: { nombre: string; email: string; password: string }) => Promise<PublicUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

// Estado global de sesión (Contexto, no Zustand): un solo valor simple
// (usuario autenticado o no) que pocos componentes leen — no justifica una
// librería de estado aparte, ver retail-frontend-react-components sección 3.
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  const bootstrap = useCallback(async () => {
    try {
      const { user: current } = await fetchCurrentUser();
      setUser(current);
      setStatus("authenticated");
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (input: { email: string; password: string }) => {
    const { user: loggedIn } = await loginAccount(input);
    setUser(loggedIn);
    setStatus("authenticated");
    return loggedIn;
  }, []);

  const register = useCallback(async (input: { nombre: string; email: string; password: string }) => {
    const { user: created } = await registerAccount(input);
    return created;
  }, []);

  const logout = useCallback(async () => {
    await logoutAccount().catch(() => undefined);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <UserContext.Provider value={{ user, status, login, register, logout, refresh: bootstrap }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser debe usarse dentro de <UserProvider>.");
  return context;
}
