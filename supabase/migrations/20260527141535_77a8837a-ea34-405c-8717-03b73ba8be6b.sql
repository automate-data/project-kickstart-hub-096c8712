
-- Security definer helper to get a user's condominium ids without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.user_condominium_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT condominium_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND deleted_at IS NULL
    AND condominium_id IS NOT NULL
$$;

-- Rewrite user_roles policies to avoid self-referencing subqueries
DROP POLICY IF EXISTS "Users can view roles in their condominium" ON public.user_roles;
CREATE POLICY "Users can view roles in their condominium"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND condominium_id IN (SELECT public.user_condominium_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Admins can insert roles in own condominium" ON public.user_roles;
CREATE POLICY "Admins can insert roles in own condominium"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'superadmin'::app_role
  AND (
    condominium_id IN (SELECT public.user_condominium_ids(auth.uid()))
    OR condominium_id IN (SELECT c.id FROM condominiums c WHERE c.admin_user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can update roles in own condominium" ON public.user_roles;
CREATE POLICY "Admins can update roles in own condominium"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND condominium_id IN (SELECT public.user_condominium_ids(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'superadmin'::app_role
  AND condominium_id IN (SELECT public.user_condominium_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Admins can delete roles in own condominium" ON public.user_roles;
CREATE POLICY "Admins can delete roles in own condominium"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND condominium_id IN (SELECT public.user_condominium_ids(auth.uid()))
);

-- Also rewrite condominiums policies that had self-referencing subqueries against user_roles
DROP POLICY IF EXISTS "Users view condominiums they belong to" ON public.condominiums;
CREATE POLICY "Users view condominiums they belong to"
ON public.condominiums
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR admin_user_id = auth.uid()
  OR id IN (SELECT public.user_condominium_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Admins can update their condominiums" ON public.condominiums;
CREATE POLICY "Admins can update their condominiums"
ON public.condominiums
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND (admin_user_id = auth.uid() OR id IN (SELECT public.user_condominium_ids(auth.uid()))))
)
WITH CHECK (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND (admin_user_id = auth.uid() OR id IN (SELECT public.user_condominium_ids(auth.uid()))))
);
