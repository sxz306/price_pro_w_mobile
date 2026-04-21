import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { clearAuth, loadAuth, saveAuth } from "@/lib/auth";

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; email: string; token: string };

type AuthContextValue = {
  state: AuthState;
  setSession: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    loadAuth().then((stored) => {
      if (stored?.token) {
        setState({
          status: "authenticated",
          email: stored.email,
          token: stored.token,
        });
      } else {
        setState({ status: "anonymous" });
      }
    });
  }, []);

  const setSession = useCallback(async (email: string, token: string) => {
    await saveAuth({ email, token });
    setState({ status: "authenticated", email, token });
  }, []);

  const signOut = useCallback(async () => {
    await clearAuth();
    setState({ status: "anonymous" });
  }, []);

  return (
    <AuthContext.Provider value={{ state, setSession, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
