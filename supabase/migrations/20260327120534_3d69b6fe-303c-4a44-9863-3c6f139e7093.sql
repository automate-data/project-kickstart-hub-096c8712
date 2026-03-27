
-- Add superadmin to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';

-- Create system_logs table
CREATE TABLE public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  condominium_id UUID REFERENCES public.condominiums(id),
  package_id UUID REFERENCES public.packages(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_logs_event_type ON public.system_logs(event_type);
CREATE INDEX idx_system_logs_condominium_id ON public.system_logs(condominium_id);
CREATE INDEX idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX idx_system_logs_user_id ON public.system_logs(user_id);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin can read all logs"
  ON public.system_logs FOR SELECT TO authenticated
  USING (auth.email() = 'contato@automatedata.com.br');

CREATE POLICY "Authenticated users can insert logs"
  ON public.system_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create user_sessions table
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  condominium_id UUID REFERENCES public.condominiums(id),
  login_at TIMESTAMPTZ DEFAULT NOW(),
  logout_at TIMESTAMPTZ
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin can read all sessions"
  ON public.user_sessions FOR SELECT TO authenticated
  USING (auth.email() = 'contato@automatedata.com.br');

CREATE POLICY "Users can insert own sessions"
  ON public.user_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.user_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Create condominium_stats view
CREATE OR REPLACE VIEW public.condominium_stats AS
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
