
-- Add last_seen_at column for heartbeat tracking
ALTER TABLE public.user_sessions
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

UPDATE public.user_sessions
SET last_seen_at = COALESCE(logout_at, login_at)
WHERE last_seen_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_open
  ON public.user_sessions (user_id, login_at DESC)
  WHERE logout_at IS NULL;

-- Deduplicate: keep only the most recent session per user/condominium
-- when multiple sessions started within the same hour with no logout.
WITH ranked AS (
  SELECT id, user_id, condominium_id, login_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, condominium_id, date_trunc('hour', login_at)
      ORDER BY login_at DESC
    ) AS rn
  FROM public.user_sessions
  WHERE logout_at IS NULL
)
DELETE FROM public.user_sessions s
USING ranked r
WHERE s.id = r.id AND r.rn > 1;
