import { supabase } from '@/integrations/supabase/client';

export async function insertLog(params: {
  event_type: string;
  condominium_id?: string;
  package_id?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('system_logs').insert({
      event_type: params.event_type,
      condominium_id: params.condominium_id || null,
      package_id: params.package_id || null,
      metadata: params.metadata || {},
      user_id: user.id,
    } as any);
  } catch (e) {
    console.error('[Logger] Failed to insert log:', e);
  }
}
