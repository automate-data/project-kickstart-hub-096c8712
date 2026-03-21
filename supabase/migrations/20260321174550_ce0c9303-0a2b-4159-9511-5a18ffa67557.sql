
-- ============================================
-- RESIDENTS: drop all existing policies
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view residents" ON public.residents;
DROP POLICY IF EXISTS "Authenticated users can insert residents" ON public.residents;
DROP POLICY IF EXISTS "Authenticated users can update residents" ON public.residents;
DROP POLICY IF EXISTS "Authenticated users can delete residents" ON public.residents;

-- RESIDENTS: new isolated policies
CREATE POLICY "Users can view residents of their condominium"
  ON public.residents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.condominium_id = residents.condominium_id
    )
  );

CREATE POLICY "Users can insert residents in their condominium"
  ON public.residents FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.condominium_id = residents.condominium_id
    )
  );

CREATE POLICY "Users can update residents of their condominium"
  ON public.residents FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.condominium_id = residents.condominium_id
    )
  );

CREATE POLICY "Users can delete residents of their condominium"
  ON public.residents FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.condominium_id = residents.condominium_id
    )
  );

-- ============================================
-- PACKAGES: drop all existing policies
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view packages" ON public.packages;
DROP POLICY IF EXISTS "Authenticated users can insert packages" ON public.packages;
DROP POLICY IF EXISTS "Authenticated users can update packages" ON public.packages;

-- PACKAGES: new isolated policies
CREATE POLICY "Users can view packages of their condominium"
  ON public.packages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.condominium_id = packages.condominium_id
    )
  );

CREATE POLICY "Users can insert packages in their condominium"
  ON public.packages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.condominium_id = packages.condominium_id
    )
  );

CREATE POLICY "Users can update packages of their condominium"
  ON public.packages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.condominium_id = packages.condominium_id
    )
  );
