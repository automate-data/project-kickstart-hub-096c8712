
ALTER TABLE public.condominiums
  DROP CONSTRAINT IF EXISTS condominiums_custody_mode_check;

ALTER TABLE public.condominiums
  ADD CONSTRAINT condominiums_custody_mode_check
  CHECK (custody_mode IN ('simple', 'simple_locker', 'multi_custody'));
