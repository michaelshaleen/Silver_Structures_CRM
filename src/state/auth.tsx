import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { isSupabaseConfigured, supabase } from '../data/supabaseClient';

const LOCAL_SESSION_KEY = 'silver-s-crm:session';
const LOCAL_PASSCODE = (import.meta.env.VITE_LOCAL_PASSCODE as string) || 'silver';

interface AuthValue {
  ready: boolean;
  signedIn: boolean;
  identity: string | null;
  mode: 'local' | 'supabase';
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [identity, setIdentity] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured) {
      setIdentity(localStorage.getItem(LOCAL_SESSION_KEY));
      setReady(true);
      return;
    }

    supabase()
      .auth.getSession()
      .then(({ data }) => {
        if (!active) return;
        setIdentity(data.session?.user.email ?? null);
        setReady(true);
      });

    const { data: sub } = supabase().auth.onAuthStateChange((_event, session) => {
      setIdentity(session?.user.email ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      if (password !== LOCAL_PASSCODE) {
        throw new Error('Wrong passcode.');
      }
      const who = email.trim() || 'owner';
      localStorage.setItem(LOCAL_SESSION_KEY, who);
      setIdentity(who);
      return;
    }

    const { error } = await supabase().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) {
      localStorage.removeItem(LOCAL_SESSION_KEY);
      setIdentity(null);
      return;
    }
    await supabase().auth.signOut();
    setIdentity(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      signedIn: identity !== null,
      identity,
      mode: isSupabaseConfigured ? 'supabase' : 'local',
      signIn,
      signOut,
    }),
    [ready, identity, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}
