
-- 1. Create helper function: check if two users share a condominium
CREATE OR REPLACE FUNCTION public.shares_condominium(_user_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur1
    JOIN user_roles ur2 ON ur1.condominium_id = ur2.condominium_id
    WHERE ur1.user_id = _user_id
      AND ur2.user_id = _target_user_id
      AND ur1.deleted_at IS NULL
      AND ur2.deleted_at IS NULL
  )
$$;

-- 2. Fix profiles SELECT policy: own profile OR same condominium OR superadmin
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Users can view own or same condominium profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.shares_condominium(auth.uid(), id)
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
  );

-- 3. Fix superadmin hardcoded email in system_logs
DROP POLICY IF EXISTS "Superadmin can read all logs" ON public.system_logs;
CREATE POLICY "Superadmin can read all logs" ON public.system_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role));

-- 4. Fix superadmin hardcoded email in user_sessions
DROP POLICY IF EXISTS "Superadmin can read all sessions" ON public.user_sessions;
CREATE POLICY "Superadmin can read all sessions" ON public.user_sessions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role));

-- 5. Recreate condominium_stats view with security_invoker so it respects RLS on underlying tables
-- Only superadmins should see this view
DROP VIEW IF EXISTS public.condominium_stats;
CREATE VIEW public.condominium_stats
WITH (security_invoker = true)
AS
SELECT c.id AS condominium_id,
    c.name AS condominium_name,
    count(DISTINCT p.id) FILTER (WHERE (p.status = 'pending'::text)) AS packages_pending,
    count(DISTINCT p.id) FILTER (WHERE (p.status = 'picked_up'::text)) AS packages_picked_up,
    count(DISTINCT p.id) FILTER (WHERE (p.created_at >= (now() - '30 days'::interval))) AS packages_last_30d,
    count(DISTINCT sl.id) FILTER (WHERE ((sl.event_type = 'whatsapp_sent'::text) AND (sl.created_at >= (now() - '30 days'::interval)))) AS whatsapp_sent_30d,
    count(DISTINCT sl.id) FILTER (WHERE ((sl.event_type = ANY (ARRAY['whatsapp_failed'::text, 'ai_label_failed'::text, 'error'::text])) AND (sl.created_at >= (now() - '30 days'::interval)))) AS errors_30d,
    count(DISTINCT r.id) AS total_residents,
    count(DISTINCT ur.user_id) AS total_staff
   FROM ((((condominiums c
     LEFT JOIN packages p ON ((p.condominium_id = c.id)))
     LEFT JOIN system_logs sl ON ((sl.condominium_id = c.id)))
     LEFT JOIN residents r ON (((r.condominium_id = c.id) AND (r.deleted_at IS NULL))))
     LEFT JOIN user_roles ur ON (((ur.condominium_id = c.id) AND (ur.deleted_at IS NULL))))
  GROUP BY c.id, c.name;
