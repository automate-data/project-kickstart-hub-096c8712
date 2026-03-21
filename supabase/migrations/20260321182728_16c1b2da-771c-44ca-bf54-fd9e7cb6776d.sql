
-- Fix: Remove deleted_at filter from SELECT policies (filter in app code instead)
-- This prevents 403 errors when soft-deleting records

-- user_roles: allow seeing soft-deleted rows (app will filter)
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
CREATE POLICY "Users can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (true);

-- residents: allow seeing soft-deleted rows (app will filter)
DROP POLICY IF EXISTS "Users can view residents of their condominium" ON public.residents;
CREATE POLICY "Users can view residents of their condominium"
ON public.residents FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.condominium_id = residents.condominium_id
  )
);
