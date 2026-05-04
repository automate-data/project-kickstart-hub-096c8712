UPDATE public.user_sessions s SET condominium_id = ur.condominium_id
FROM (
  SELECT DISTINCT ON (user_id) user_id, condominium_id
  FROM public.user_roles
  WHERE condominium_id IS NOT NULL AND deleted_at IS NULL
  ORDER BY user_id
) ur
WHERE s.condominium_id IS NULL AND s.user_id = ur.user_id;