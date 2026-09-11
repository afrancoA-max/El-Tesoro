"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { PublicUser } from "@el-tesoro/shared";
import { fetchCurrentUser, loginAccount, logoutAccount, registerAccount } from "@/services/accountApi";
import { createTabChannel } from "@/lib/tabSync";

// CAR-02: cerrar sesión en una pestaña no afectaba a las demás hasta que
// recargaban. Cada pestaña avisa a las demás por este canal cuando su
// propia sesión cambia; las demás no confían en el mensaje en sí (podría
// venir de una pestaña con estado obsoleto) sino que lo usan solo como
// señal para volver a preguntarle al backend con `/auth/me`.
const sessionChannel = createTabChannel<{ type: "login" | "logout" }>("eltesoro-session");

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

  // No se llama a `bootstrap` aquí a propósito: react-hooks/set-state-in-effect
  // marca como riesgoso invocar desde un efecto una función externa que
  // actualiza estado, porque no puede verificar que el setState ocurra tras
  // un await. La promesa inline sí lo deja claro para el linter.
  useEffect(() => {
    fetchCurrentUser()
      .then(({ user: current }) => {
        setUser(current);
        setStatus("authenticated");
      })
      .catch(() => {
        setUser(null);
        setStatus("unauthenticated");
      });
  }, []);

  // CAR-02: si otra pestaña inicia o cierra sesión, esta vuelve a preguntarle
  // al backend en vez de copiar el mensaje a ciegas — las cookies de sesión
  // ya son compartidas entre pestañas, así que `bootstrap` siempre refleja
  // el estado real sin importar cuál pestaña originó el cambio. `bootstrap`
  // es estable (useCallback con `[]`), así que suscribirse una sola vez es
  // seguro.
  useEffect(() => sessionChannel.subscribe(() => bootstrap()), [bootstrap]);

  const login = useCallback(async (input: { email: string; password: string }) => {
    const { user: loggedIn } = await loginAccount(input);
    setUser(loggedIn);
    setStatus("authenticated");
    sessionChannel.post({ type: "login" });
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
    sessionChannel.post({ type: "logout" });
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
