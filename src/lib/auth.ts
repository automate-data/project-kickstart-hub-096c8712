import { supabase } from '@/integrations/supabase/client';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  avatar_url?: string;
}

export const generateId = (): string => crypto.randomUUID();

export const loginWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
};

export const loginWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` } });
  return { data, error };
};

export const registerWithEmail = async (email: string, password: string, userData: { name: string; company: string; phone: string }) => {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { name: userData.name, company: userData.company, phone: userData.phone } } });
  return { data, error };
};

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
};

export const resetPassword = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro inesperado' };
  }
};

export const getUserProfile = async (userId: string): Promise<{ data: AuthUser | null; error: any }> => {
  const { data, error } = await supabase.from('perfis').select('*').eq('id', userId).maybeSingle();
  if (error) return { data: null, error };
  if (!data) return { data: null, error: null };
  return { data: { id: data.id, email: data.email, name: data.nome, company: data.empresa, phone: data.telefone, avatar_url: data.avatar_url }, error: null };
};