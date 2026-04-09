
-- 1. Drop all existing user_roles policies
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- 2. SELECT: users can see their own roles + roles in same condominium + superadmin sees all
CREATE POLICY "Users can view roles in their condominium"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR condominium_id IN (
      SELECT ur.condominium_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL
    )
    OR has_role(auth.uid(), 'superadmin'::app_role)
  );

-- 3. INSERT: admins can only insert roles in their own condominium, and cannot assign superadmin
CREATE POLICY "Admins can insert roles in own condominium"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'superadmin'::app_role
    AND condominium_id IN (
      SELECT ur.condominium_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL
    )
  );

-- 4. UPDATE: admins can only update roles in their own condominium, cannot set superadmin
CREATE POLICY "Admins can update roles in own condominium"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND condominium_id IN (
      SELECT ur.condominium_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'superadmin'::app_role
    AND condominium_id IN (
      SELECT ur.condominium_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL
    )
  );

-- 5. DELETE: admins can only delete roles in their own condominium
CREATE POLICY "Admins can delete roles in own condominium"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND condominium_id IN (
      SELECT ur.condominium_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL
    )
  );
