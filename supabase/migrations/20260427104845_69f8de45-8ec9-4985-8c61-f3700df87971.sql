-- 1) Backfill: criar o vínculo faltante
INSERT INTO public.user_roles (user_id, role, condominium_id)
SELECT '56674d85-398d-4def-8a30-c48864734c47', 'admin', '91b0ba23-a8b3-4481-98a0-0a3a74f00602'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = '56674d85-398d-4def-8a30-c48864734c47'
    AND condominium_id = '91b0ba23-a8b3-4481-98a0-0a3a74f00602'
    AND deleted_at IS NULL
);

-- 2) Corrigir policy circular de INSERT em user_roles
DROP POLICY IF EXISTS "Admins can insert roles in own condominium" ON public.user_roles;

CREATE POLICY "Admins can insert roles in own condominium"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'superadmin'::app_role
  AND (
    -- já tem vínculo nesse condomínio
    condominium_id IN (
      SELECT ur.condominium_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL
    )
    -- OU é o admin que criou esse condomínio (permite o primeiro vínculo)
    OR condominium_id IN (
      SELECT c.id FROM condominiums c WHERE c.admin_user_id = auth.uid()
    )
  )
);