-- Add condominium_id to user_roles for per-condominium staff isolation
ALTER TABLE public.user_roles ADD COLUMN condominium_id UUID REFERENCES public.condominiums(id) ON DELETE CASCADE;

-- Drop old unique constraint and create new one scoped by condominium
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_condo_unique UNIQUE (user_id, condominium_id);

-- Update delete policy to scope by condominium
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update insert policy
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));