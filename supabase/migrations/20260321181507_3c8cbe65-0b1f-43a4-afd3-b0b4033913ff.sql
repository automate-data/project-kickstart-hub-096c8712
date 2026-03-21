
-- Add deleted_at to residents
ALTER TABLE public.residents ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at to user_roles
ALTER TABLE public.user_roles ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Update residents SELECT policy to filter soft-deleted
DROP POLICY IF EXISTS "Users can view residents of their condominium" ON public.residents;
CREATE POLICY "Users can view residents of their condominium"
ON public.residents FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.condominium_id = residents.condominium_id
  )
);

-- Update user_roles SELECT policy to filter soft-deleted
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
CREATE POLICY "Users can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (deleted_at IS NULL);
