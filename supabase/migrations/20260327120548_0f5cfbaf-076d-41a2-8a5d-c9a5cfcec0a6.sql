
-- Fix security definer view by recreating with security_invoker
DROP VIEW IF EXISTS public.condominium_stats;
CREATE VIEW public.condominium_stats WITH (security_invoker = true) AS
SELECT 
  c.id AS condominium_id,
  c.name AS condominium_name,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'pending') AS packages_pending,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'picked_up') AS packages_picked_up,
  COUNT(DISTINCT p.id) FILTER (WHERE p.created_at >= NOW() - INTERVAL '30 days') AS packages_last_30d,
  COUNT(DISTINCT sl.id) FILTER (WHERE sl.event_type = 'whatsapp_sent' AND sl.created_at >= NOW() - INTERVAL '30 days') AS whatsapp_sent_30d,
  COUNT(DISTINCT sl.id) FILTER (WHERE sl.event_type IN ('whatsapp_failed', 'ai_label_failed', 'error') AND sl.created_at >= NOW() - INTERVAL '30 days') AS errors_30d,
  COUNT(DISTINCT r.id) AS total_residents,
  COUNT(DISTINCT ur.user_id) AS total_staff
FROM public.condominiums c
LEFT JOIN public.packages p ON p.condominium_id = c.id
LEFT JOIN public.system_logs sl ON sl.condominium_id = c.id
LEFT JOIN public.residents r ON r.condominium_id = c.id AND r.deleted_at IS NULL
LEFT JOIN public.user_roles ur ON ur.condominium_id = c.id AND ur.deleted_at IS NULL
GROUP BY c.id, c.name;

-- Tighten INSERT policy on system_logs to require user_id match
DROP POLICY "Authenticated users can insert logs" ON public.system_logs;
CREATE POLICY "Authenticated users can insert logs"
  ON public.system_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
