import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TARGET_ID = 'df888202-1a6f-4121-956a-1270f04065e2'; // Solar dos Pinheiros (sem Bloco A)
const PROTECTED_BLOCO_A = '91b0ba23-a8b3-4481-98a0-0a3a74f00602';
const KEEP_USER_ID = '56674d85-398d-4def-8a30-c48864734c47'; // contato@automatedata.com.br
const USERS_TO_DELETE = [
  '1f9bd178-df8b-483f-b82d-3ba1d97c05b6', // helena
  '38cc999a-9e91-4d7d-a154-4fc879b5e73c', // tereza
  '43b474a3-f459-47e7-872f-a3a4ddadbbcd', // maria
  '33d28920-e744-4504-a26a-e87493aa8eae', // julia
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (TARGET_ID === PROTECTED_BLOCO_A) {
    return new Response(JSON.stringify({ error: 'Refuses to delete Bloco A' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const report: Record<string, unknown> = { target: TARGET_ID };

  try {
    // 1. Coletar IDs de pacotes + photos
    const { data: pkgs, error: ePkg } = await admin
      .from('packages').select('id, photo_url').eq('condominium_id', TARGET_ID);
    if (ePkg) throw new Error('list packages: ' + ePkg.message);
    const pkgIds = (pkgs ?? []).map((p) => p.id);
    const photoPaths = (pkgs ?? []).map((p) => p.photo_url).filter(Boolean) as string[];
    report.packages_found = pkgIds.length;
    report.photos_found = photoPaths.length;

    // 2. Apagar fotos do storage (em chunks de 100)
    let photosDeleted = 0;
    for (let i = 0; i < photoPaths.length; i += 100) {
      const chunk = photoPaths.slice(i, i + 100);
      const { error } = await admin.storage.from('package-photos').remove(chunk);
      if (error) throw new Error('storage remove: ' + error.message);
      photosDeleted += chunk.length;
    }
    report.photos_deleted = photosDeleted;

    // 3. package_events
    if (pkgIds.length > 0) {
      const { error, count } = await admin
        .from('package_events').delete({ count: 'exact' }).in('package_id', pkgIds);
      if (error) throw new Error('delete package_events: ' + error.message);
      report.package_events_deleted = count;
    } else {
      report.package_events_deleted = 0;
    }

    // 4. system_logs
    {
      const { error, count } = await admin
        .from('system_logs').delete({ count: 'exact' }).eq('condominium_id', TARGET_ID);
      if (error) throw new Error('delete system_logs: ' + error.message);
      report.system_logs_deleted = count;
    }

    // 5. user_sessions
    {
      const { error, count } = await admin
        .from('user_sessions').delete({ count: 'exact' }).eq('condominium_id', TARGET_ID);
      if (error) throw new Error('delete user_sessions: ' + error.message);
      report.user_sessions_deleted = count;
    }

    // 6. packages
    {
      const { error, count } = await admin
        .from('packages').delete({ count: 'exact' }).eq('condominium_id', TARGET_ID);
      if (error) throw new Error('delete packages: ' + error.message);
      report.packages_deleted = count;
    }

    // 7. residents
    {
      const { error, count } = await admin
        .from('residents').delete({ count: 'exact' }).eq('condominium_id', TARGET_ID);
      if (error) throw new Error('delete residents: ' + error.message);
      report.residents_deleted = count;
    }

    // 8. user_roles (todos do condomínio, incluindo a role do KEEP_USER_ID neste cond)
    {
      const { error, count } = await admin
        .from('user_roles').delete({ count: 'exact' }).eq('condominium_id', TARGET_ID);
      if (error) throw new Error('delete user_roles: ' + error.message);
      report.user_roles_deleted = count;
    }

    // 9. locations
    {
      const { error, count } = await admin
        .from('locations').delete({ count: 'exact' }).eq('condominium_id', TARGET_ID);
      if (error) throw new Error('delete locations: ' + error.message);
      report.locations_deleted = count;
    }

    // 10. condominium
    {
      const { error, count } = await admin
        .from('condominiums').delete({ count: 'exact' }).eq('id', TARGET_ID);
      if (error) throw new Error('delete condominium: ' + error.message);
      report.condominium_deleted = count;
    }

    // 11. auth.users — apagar somente os 4 dedicados (NUNCA o KEEP_USER_ID)
    const usersDeleted: string[] = [];
    const usersFailed: { id: string; error: string }[] = [];
    for (const uid of USERS_TO_DELETE) {
      if (uid === KEEP_USER_ID) continue;
      const { error } = await admin.auth.admin.deleteUser(uid);
      if (error) usersFailed.push({ id: uid, error: error.message });
      else usersDeleted.push(uid);
    }
    report.auth_users_deleted = usersDeleted;
    report.auth_users_failed = usersFailed;

    return new Response(JSON.stringify({ ok: true, report }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e), report }, null, 2), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
