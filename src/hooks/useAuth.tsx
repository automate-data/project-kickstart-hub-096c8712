import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { loginWithEmail, registerWithEmail, logout as authLogout, getUserProfile, resetPassword } from '@/lib/auth';
import { checkRateLimit } from '@/lib/validation';
import type { Session } from '@supabase/supabase-js';
import type { AuthUser } from '@/lib/auth';

interface AuthContextType { user: AuthUser | null; session: Session | null; login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>; register: (userData: any) => Promise<{ success: boolean; error?: string }>; logout: () => Promise<void>; resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>; loading: boolean; }
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadUserProfile = async (userId: string, event?: string) => {
    try {
      const { data: profile } = await getUserProfile(userId);
      setUser(profile);
      setLoading(false);
      if (event === 'SIGNED_IN') { const p = window.location.pathname; if (p === '/' || p === '/login' || p === '/register') navigate('/dashboard'); }
    } catch { setLoading(false); }
  };

  useEffect(() => {
    let isMounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      setSession(session);
      if (session?.user) setTimeout(() => { if (isMounted) loadUserProfile(session.user.id, event); }, 0);
      else { setUser(null); setLoading(false); }
    });
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (isMounted) { setSession(session); if (session?.user) await loadUserProfile(session.user.id); else setLoading(false); }
    };
    init();
    return () => { isMounted = false; subscription.unsubscribe(); };
  }, []);

  const login = async (email: string, password: string) => {
    if (!checkRateLimit(`login_${email}`, 5, 300000)) return { success: false, error: "Muitas tentativas. Tente novamente em alguns minutos." };
    try {
      const { data, error } = await loginWithEmail(email, password);
      if (error) return { success: false, error: error.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : error.message };
      if (!data?.session) return { success: false, error: "Erro ao criar sessão." };
      setSession(data.session);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  };

  const register = async (userData: any) => {
    try {
      const { error } = await registerWithEmail(userData.email, userData.password, { name: userData.name, company: userData.company, phone: userData.phone });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  };

  const logout = async () => { await authLogout(); setUser(null); setSession(null); navigate('/'); };
  const handleResetPassword = async (email: string) => { const result = await resetPassword(email); return result.success ? { success: true } : { success: false, error: (result as any).error }; };

  return <AuthContext.Provider value={{ user, session, login, register, logout, resetPassword: handleResetPassword, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => { const context = useContext(AuthContext); if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider'); return context; };