import { supabase } from '@/integrations/supabase/client';

export const waitForValidSession = async (maxRetries = 10): Promise<string> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!error && session?.user?.id) return session.user.id;
  } catch (error) { console.warn('Erro ao obter sessão inicial:', error); }

  return new Promise((resolve, reject) => {
    let attempts = 0;
    const checkSession = async () => {
      attempts++;
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!error && session?.user?.id) { resolve(session.user.id); return; }
        if (attempts >= maxRetries) { reject(new Error('Usuário não autenticado. Faça login novamente.')); return; }
        setTimeout(checkSession, 300);
      } catch (error) { if (attempts >= maxRetries) reject(error); else setTimeout(checkSession, 300); }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => { if (session?.user?.id) { subscription.unsubscribe(); resolve(session.user.id); } });
    checkSession();
    setTimeout(() => { subscription.unsubscribe(); reject(new Error('Timeout: Usuário não autenticado.')); }, 15000);
  });
};