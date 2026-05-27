
-- 1. Fix has_role to exclude soft-deleted roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND deleted_at IS NULL
  )
$function$;

-- 2. Restrict condominiums SELECT to membership / superadmin / pre-setup admin
DROP POLICY IF EXISTS "Authenticated users can view condominiums" ON public.condominiums;
CREATE POLICY "Users view condominiums they belong to"
ON public.condominiums
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR admin_user_id = auth.uid()
  OR id IN (
    SELECT condominium_id FROM public.user_roles
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  )
);

-- 3. Restrict condominiums UPDATE to that condominium's admin
DROP POLICY IF EXISTS "Admins can update condominiums" ON public.condominiums;
CREATE POLICY "Admins can update their condominiums"
ON public.condominiums
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND (
      admin_user_id = auth.uid()
      OR id IN (
        SELECT condominium_id FROM public.user_roles
        WHERE user_id = auth.uid() AND deleted_at IS NULL
      )
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND (
      admin_user_id = auth.uid()
      OR id IN (
        SELECT condominium_id FROM public.user_roles
        WHERE user_id = auth.uid() AND deleted_at IS NULL
      )
    )
  )
);

-- 4. Restrict condominiums DELETE to that condominium's admin (or superadmin)
DROP POLICY IF EXISTS "Admins can delete condominiums" ON public.condominiums;
CREATE POLICY "Admins can delete their condominiums"
ON public.condominiums
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND admin_user_id = auth.uid()
  )
);

-- 5. Restrict user_roles SELECT so admins only see roles in their condominium
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
    AND condominium_id IN (
      SELECT ur.condominium_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL
    )
  )
);

-- 6. Add UPDATE/DELETE policies on package-photos bucket (owner-scoped)
CREATE POLICY "Authenticated users can update package photos in their condo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'package-photos' AND owner = auth.uid())
WITH CHECK (bucket_id = 'package-photos' AND owner = auth.uid());

CREATE POLICY "Authenticated users can delete package photos in their condo"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'package-photos' AND owner = auth.uid());
