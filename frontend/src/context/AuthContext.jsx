import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  /** Inicia sesión con un proveedor OAuth (github, google…). */
  const signIn = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signOut = () => supabase.auth.signOut();

  const user = session?.user ?? null;
  const profile = user && {
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.user_name || user.email,
    email: user.email,
    avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    provider: user.app_metadata?.provider,
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
