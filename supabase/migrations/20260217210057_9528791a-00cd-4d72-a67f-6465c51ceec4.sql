
-- Add condominium_id to packages table
ALTER TABLE public.packages 
ADD COLUMN condominium_id uuid REFERENCES public.condominiums(id);

-- Backfill condominium_id from linked residents
UPDATE public.packages p
SET condominium_id = r.condominium_id
FROM public.residents r
WHERE p.resident_id = r.id AND r.condominium_id IS NOT NULL;

-- Create index for performance
CREATE INDEX idx_packages_condominium_id ON public.packages(condominium_id);
