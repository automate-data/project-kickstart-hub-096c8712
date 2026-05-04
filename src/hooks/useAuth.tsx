import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoading: boolean;
  mustChangePassword: boolean;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const fetchUserRole = async (userId: string, email?: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (data && data.length > 0) {
      // Prioritize superadmin role if user has multiple roles
      const hasSuperadmin = data.some(r => r.role === 'superadmin');
      if (hasSuperadmin) {
        setRole('superadmin');
        return;
      }
      // Then prioritize admin
      const hasAdmin = data.some(r => r.role === 'admin');
      if (hasAdmin) {
        setRole('admin');
        return;
      }
      setRole(data[0].role as AppRole);
    } else {
      setRole(null);
    }
  };

  const trackSession = async (userId: string) => {
    const condId = localStorage.getItem('selected_condominium_id');
    const now = new Date().toISOString();
    // Check if there's already an open session for this user
    const { data: existing } = await supabase
      .from('user_sessions')
      .select('id, condominium_id')
      .eq('user_id', userId)
      .is('logout_at', null)
      .order('login_at', { ascending: false })
      .limit(1);
    if (existing && existing.length > 0) {
      // Update last_seen_at (and condominium if it was missing)
      const patch: any = { last_seen_at: now };
      if (!existing[0].condominium_id && condId) patch.condominium_id = condId;
      await supabase.from('user_sessions').update(patch).eq('id', existing[0].id);
      return;
    }
    await supabase.from('user_sessions').insert({
      user_id: userId,
      condominium_id: condId || null,
      login_at: now,
      last_seen_at: now,
    } as any);
  };

  // Heartbeat: update last_seen_at every 60s while tab is active
  useEffect(() => {
    if (!user) return;
    const tick = () => {
      if (document.visibilityState === 'visible') trackSession(user.id);
    };
    const interval = setInterval(tick, 60000);
    const onVis = () => tick();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setMustChangePassword(session?.user?.user_metadata?.must_change_password === true);
      
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
      
      if (session?.user) {
        setTimeout(() => {
          fetchUserRole(session.user.id, session.user.email);
        }, 0);
        // Track session on SIGNED_IN or TOKEN_REFRESHED
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          trackSession(session.user.id);
        }
      } else {
        setRole(null);
      }
      setIsLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setMustChangePassword(session?.user?.user_metadata?.must_change_password === true);
      
      if (session?.user) {
        fetchUserRole(session.user.id, session.user.email);
        // Track session for existing session (e.g. PWA reload)
        trackSession(session.user.id);
      }
      setIsLoading(false);
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    // Session tracking is now handled by onAuthStateChange
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    // Close open session
    if (user) {
      supabase.from('user_sessions')
        .update({ logout_at: new Date().toISOString() } as any)
        .eq('user_id', user.id)
        .is('logout_at', null)
        .then(() => {});
    }
    await supabase.auth.signOut();
    setRole(null);
    setMustChangePassword(false);
    setIsPasswordRecovery(false);
  };

  const refreshUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      setMustChangePassword(user.user_metadata?.must_change_password === true);
    }
  };

  const clearPasswordRecovery = () => setIsPasswordRecovery(false);

  return (
    <AuthContext.Provider value={{ user, session, role, isLoading, mustChangePassword, isPasswordRecovery, clearPasswordRecovery, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
