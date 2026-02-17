
-- Create condominiums table
CREATE TABLE public.condominiums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj text,
  address text,
  city text,
  state text,
  zip_code text,
  phone text,
  email text,
  unit_type text NOT NULL DEFAULT 'apartment',
  group_label text NOT NULL DEFAULT 'Bloco',
  unit_label text NOT NULL DEFAULT 'Apartamento',
  groups jsonb NOT NULL DEFAULT '[]'::jsonb,
  setup_completed boolean NOT NULL DEFAULT false,
  admin_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.condominiums ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can insert condominiums"
ON public.condominiums FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update condominiums"
ON public.condominiums FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete condominiums"
ON public.condominiums FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- All authenticated users can read
CREATE POLICY "Authenticated users can view condominiums"
ON public.condominiums FOR SELECT TO authenticated
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_condominiums_updated_at
BEFORE UPDATE ON public.condominiums
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Add condominium_id to residents
ALTER TABLE public.residents
ADD COLUMN condominium_id uuid REFERENCES public.condominiums(id);
