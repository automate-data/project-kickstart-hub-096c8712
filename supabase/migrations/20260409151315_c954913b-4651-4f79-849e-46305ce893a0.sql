
-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view roles in their condominium" ON public.user_roles;

-- Create a non-recursive SELECT policy using the SECURITY DEFINER function
CREATE POLICY "Users can view roles in their condominium"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'superadmin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );
