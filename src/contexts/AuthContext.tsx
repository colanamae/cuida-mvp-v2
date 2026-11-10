import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { configured, supabase } from "../services/supabase";
import { api } from "../services/api";
import type { Household } from "../types/models";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  households: Household[];
  household: Household | null;
  setHousehold: (id: string) => void;
  refresh: () => Promise<void>;
};

const Context = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [activeId, setActiveId] = useState("");

  const refresh = useCallback(async () => {
    if (!configured || !session) {
      setHouseholds([]);
      setActiveId("");
      setLoading(false);
      return;
    }

    try {
      const data = await api.households();

      setHouseholds(data);
      setActiveId((old) =>
        data.some((h) => h.id === old) ? old : data[0]?.id || "",
      );
    } catch (error) {
      console.error("Erro ao carregar casas:", error);
      setHouseholds([]);
      setActiveId("");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      setAuthReady(true);
      return;
    }

    let mounted = true;

    async function initialize() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;
        if (!mounted) return;

        setSession(data.session);
        setAuthReady(true);
      } catch (error) {
        console.error("Erro ao verificar sessão:", error);

        if (mounted) {
          setSession(null);
          setAuthReady(true);
        }
      }
    }

    void initialize();

    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;

      setSession(s);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authReady) {
      void refresh();
    }
  }, [authReady, refresh]);

  return (
    <Context.Provider
      value={{
        user: session?.user || null,
        session,
        loading,
        households,
        household: households.find((h) => h.id === activeId) || null,
        setHousehold: setActiveId,
        refresh,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useAuth() {
  const value = useContext(Context);

  if (!value) {
    throw new Error("AuthProvider ausente");
  }

  return value;
}
