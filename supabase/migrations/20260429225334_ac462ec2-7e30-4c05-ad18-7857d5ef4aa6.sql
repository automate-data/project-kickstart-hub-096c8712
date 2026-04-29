DO $$
DECLARE
  prod_id uuid := '91b0ba23-a8b3-4481-98a0-0a3a74f00602';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.condominiums WHERE id = prod_id) THEN
    RAISE EXCEPTION 'ABORT: Production condominium % not found.', prod_id;
  END IF;
END $$;

-- 1. Logs primeiro (referenciam packages e condominiums)
DELETE FROM public.system_logs
WHERE condominium_id IS DISTINCT FROM '91b0ba23-a8b3-4481-98a0-0a3a74f00602'
   OR package_id IN (
     SELECT id FROM public.packages
     WHERE condominium_id IS DISTINCT FROM '91b0ba23-a8b3-4481-98a0-0a3a74f00602'
   );

-- 2. Eventos de pacotes
DELETE FROM public.package_events
WHERE package_id IN (
  SELECT id FROM public.packages
  WHERE condominium_id IS DISTINCT FROM '91b0ba23-a8b3-4481-98a0-0a3a74f00602'
);

-- 3. Pacotes
DELETE FROM public.packages
WHERE condominium_id IS DISTINCT FROM '91b0ba23-a8b3-4481-98a0-0a3a74f00602';

-- 4. Moradores
DELETE FROM public.residents
WHERE condominium_id IS DISTINCT FROM '91b0ba23-a8b3-4481-98a0-0a3a74f00602';

-- 5. Sessões
DELETE FROM public.user_sessions
WHERE condominium_id IS DISTINCT FROM '91b0ba23-a8b3-4481-98a0-0a3a74f00602';

-- 6. Papéis (preservando superadmins sem condominium_id)
DELETE FROM public.user_roles
WHERE condominium_id IS NOT NULL
  AND condominium_id <> '91b0ba23-a8b3-4481-98a0-0a3a74f00602';

-- 7. Locais
DELETE FROM public.locations
WHERE condominium_id <> '91b0ba23-a8b3-4481-98a0-0a3a74f00602';

-- 8. Condomínios
DELETE FROM public.condominiums
WHERE id <> '91b0ba23-a8b3-4481-98a0-0a3a74f00602';

-- Guard final
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.condominiums WHERE id = '91b0ba23-a8b3-4481-98a0-0a3a74f00602') THEN
    RAISE EXCEPTION 'ABORT: Production condominium missing after cleanup.';
  END IF;
END $$;